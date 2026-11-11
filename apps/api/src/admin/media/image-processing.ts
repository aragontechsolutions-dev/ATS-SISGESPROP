import sharp, { type Metadata } from 'sharp';

/**
 * Procesamiento de imágenes subidas desde el panel (Etapa D4, ADR-020).
 *
 * Defensa en capas:
 *  1. Firma binaria: solo JPEG, PNG o WebP (no se confía en el nombre ni en el Content-Type).
 *  2. libvips con TODOS los lectores bloqueados salvo JPEG/PNG/WebP desde memoria: un SVG, TIFF,
 *     HEIF o PDF disfrazado no llega a decodificarse.
 *  3. Límite de píxeles (bomba de descompresión) y de tamaño mínimo.
 *  4. La imagen se REDIBUJA desde los píxeles en WebP nuevo: no se conserva ningún byte del archivo
 *     original. sharp no copia metadatos salvo que se pida (keepMetadata/withMetadata), así que se
 *     eliminan EXIF (GPS, cámara), XMP, IPTC y perfiles ICC.
 */

sharp.block({ operation: ['VipsForeignLoad'] });
sharp.unblock({ operation: ['VipsForeignLoadJpegBuffer', 'VipsForeignLoadPngBuffer', 'VipsForeignLoadWebpBuffer'] });
// Render gratuito tiene 512 MB: un solo hilo y sin caché de libvips.
sharp.cache(false);
sharp.concurrency(1);

/** Tamaño máximo del archivo recibido. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** 40 megapíxeles (~160 MB sin comprimir en RGBA): cubre fotos de celular y cámara. */
export const MAX_INPUT_PIXELS = 40_000_000;
export const MIN_WIDTH = 960;
export const MIN_HEIGHT = 540;

/** Mismo formato que las imágenes fijas de la web (1408 × 768, recorte inteligente). */
const TARGET = { width: 1408, height: 768 };
export const WIDTHS = [480, 768, 1408] as const;
export const HERO_WIDTHS = [768, 1408] as const;
const QUALITY = 70;
/** La portada va bajo una capa verde al 85 %: se comprime más (igual que las fijas). */
const HERO_QUALITY = 40;

export class ImageRejectedError extends Error {}

export type DetectedFormat = 'jpeg' | 'png' | 'webp';

/** Detecta el formato por la firma binaria (magic bytes). */
export function detectFormat(buf: Buffer): DetectedFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export interface ProcessedImage {
  width: number;
  height: number;
  /** Nombre de archivo relativo (p. ej. "768.webp", "hero-1408.webp") y contenido. */
  files: Array<{ name: string; data: Buffer }>;
}

/** Nombres de los archivos generados para cada imagen (en la carpeta del id). */
export const OUTPUT_NAMES = [...WIDTHS.map((w) => `${w}.webp`), ...HERO_WIDTHS.map((w) => `hero-${w}.webp`)];

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageRejectedError('El archivo está vacío.');
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageRejectedError('La imagen supera los 10 MB.');
  const format = detectFormat(input);
  if (!format) throw new ImageRejectedError('Formato no admitido: solo JPG, PNG o WebP.');

  const opts = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' as const, pages: 1 };
  let meta: Metadata;
  try {
    meta = await sharp(input, opts).metadata();
  } catch {
    throw new ImageRejectedError('No se pudo leer la imagen (archivo dañado o no admitido).');
  }
  if (meta.format !== format) throw new ImageRejectedError('El contenido del archivo no coincide con su formato.');
  // Orientación EXIF: en orientaciones 5–8 el ancho y el alto visibles están intercambiados.
  const rotated = (meta.orientation ?? 1) >= 5;
  const w = (rotated ? meta.height : meta.width) ?? 0;
  const h = (rotated ? meta.width : meta.height) ?? 0;
  if (w * h > MAX_INPUT_PIXELS) throw new ImageRejectedError('La imagen tiene demasiados píxeles (máximo 40 MP).');
  if (w < MIN_WIDTH || h < MIN_HEIGHT) {
    throw new ImageRejectedError(`La imagen es muy chica: mínimo ${MIN_WIDTH} × ${MIN_HEIGHT} px.`);
  }

  try {
    // Un solo decodificado: se endereza según EXIF, se recorta a 1408 × 768 y se pasa a sRGB.
    const base = await sharp(input, opts)
      .rotate()
      .resize({ ...TARGET, fit: 'cover', position: sharp.strategy.attention, withoutEnlargement: false })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const raw = { raw: { width: base.info.width, height: base.info.height, channels: base.info.channels } };

    const encode = (width: number, quality: number) =>
      sharp(base.data, raw)
        .resize({ width })
        .webp({ quality, effort: 4 })
        .toBuffer();

    const files: ProcessedImage['files'] = [];
    for (const width of WIDTHS) files.push({ name: `${width}.webp`, data: await encode(width, QUALITY) });
    for (const width of HERO_WIDTHS) files.push({ name: `hero-${width}.webp`, data: await encode(width, HERO_QUALITY) });
    return { width: TARGET.width, height: TARGET.height, files };
  } catch {
    throw new ImageRejectedError('No se pudo procesar la imagen.');
  }
}
