/**
 * Imágenes ilustrativas entregadas por el cliente (11/11/2026), optimizadas a WebP en 3 anchos y
 * sin metadatos (apps/web/public/img, ver docs/marca.md). Al menos una fue generada con IA
 * (credencial C2PA de Google): NO representan propiedades administradas ni al equipo de PRIVAT,
 * y los textos alternativos las describen sin afirmar lo contrario.
 *
 * La lista de claves es la misma que acepta la API (content-schema.ts, IMAGE_KEYS).
 */
export const IMAGE_KEYS = [
  'casa-piscina-jardin',
  'casa-colinas',
  'galeria-laguna',
  'living-hogar',
  'cocina-parrillero',
  'casa-hormigon-madera',
  'casa-bosque',
  'penthouse-terraza',
  'casa-piedra-campo',
  'casa-frente-mar',
  'oficina-administracion',
  'inspeccion-cocina',
  'inspeccion-exterior-piedra',
  'inspeccion-exterior-tablet',
  'inspeccion-azotea',
  'inspeccion-tablero',
] as const;

export type ImageKey = (typeof IMAGE_KEYS)[number];

export const IMAGE_ALT: Record<ImageKey, string> = {
  'casa-piscina-jardin': 'Casa contemporánea con piscina y jardín',
  'casa-colinas': 'Casa entre colinas y rocas, con piscina',
  'galeria-laguna': 'Galería con parrillero y vista a una laguna',
  'living-hogar': 'Living luminoso con hogar y ventanales al jardín',
  'cocina-parrillero': 'Cocina y comedor con parrillero',
  'casa-hormigon-madera': 'Casa de hormigón y madera con jardín',
  'casa-bosque': 'Casa de hormigón en un bosque, con deck exterior',
  'penthouse-terraza': 'Terraza de un penthouse con vista al puerto',
  'casa-piedra-campo': 'Casa de piedra en el campo, con galería y piscina',
  'casa-frente-mar': 'Casa frente al mar con deck y piscina sobre las dunas',
  'oficina-administracion': 'Escritorio con documentación contable y gráficos',
  'inspeccion-cocina': 'Inspección de una cocina con planilla de control',
  'inspeccion-exterior-piedra': 'Inspección exterior de una casa de piedra con piscina',
  'inspeccion-exterior-tablet': 'Inspección exterior de una vivienda con tableta',
  'inspeccion-azotea': 'Inspección de una azotea con techo verde',
  'inspeccion-tablero': 'Revisión de un tablero eléctrico',
};

/** Imagen de cada nivel de servicio (los niveles vienen de la tabla service_level). */
export const LEVEL_IMAGE: Record<1 | 2 | 3, ImageKey> = {
  1: 'inspeccion-exterior-piedra',
  2: 'oficina-administracion',
  3: 'inspeccion-azotea',
};

export function isImageKey(v: string): v is ImageKey {
  return (IMAGE_KEYS as readonly string[]).includes(v);
}

/**
 * Imagen subida desde el panel (Etapa D4): la publicación trae su texto alternativo y la carpeta
 * pública en Supabase Storage. Se acepta SOLO una carpeta con la forma exacta del Storage del
 * proyecto (VITE_SUPABASE_URL): una publicación manipulada no puede apuntar a otro sitio. La CSP
 * (img-src) lo vuelve a impedir en el navegador.
 */
export interface MediaRef {
  alt: string;
  baseUrl: string;
}

export const MEDIA_KEY_RE = /^media:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const SUPABASE_ORIGIN = (() => {
  try {
    return import.meta.env.VITE_SUPABASE_URL ? new URL(import.meta.env.VITE_SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
})();

export function isSafeMediaBase(baseUrl: string, id: string): boolean {
  if (!SUPABASE_ORIGIN) return false;
  const prefix = `${SUPABASE_ORIGIN}/storage/v1/object/public/`;
  if (!baseUrl.startsWith(prefix)) return false;
  return new RegExp(`^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]/${id}/$`).test(baseUrl.slice(prefix.length));
}

/** Imagen subida lista para mostrar, o null si la clave no es de una imagen subida válida. */
export function resolveMedia(choice: string, media: Record<string, MediaRef>): MediaRef | null {
  const m = MEDIA_KEY_RE.exec(choice);
  if (!m) return null;
  const ref = Object.hasOwn(media, m[1]!) ? media[m[1]!] : undefined;
  if (!ref || typeof ref.alt !== 'string' || typeof ref.baseUrl !== 'string' || !isSafeMediaBase(ref.baseUrl, m[1]!)) return null;
  return ref;
}
