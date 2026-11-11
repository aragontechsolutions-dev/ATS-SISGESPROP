import { IMAGE_ALT, isImageKey } from '../images';

const WIDTHS = [480, 768, 1408] as const;
/** Fondo de la portada: va bajo una capa verde al 85 %, así que se sirve más comprimido (calidad 40). */
const HERO_WIDTHS = [768, 1408] as const;

/**
 * Imagen responsiva (WebP en 3 anchos). `sizes` indica el ancho que ocupará en pantalla para que
 * el navegador descargue solo el tamaño necesario. `priority` para la imagen principal (LCP).
 * `decorative`: alt vacío cuando la imagen solo ambienta (p. ej. el fondo de la portada).
 */
export function SiteImage({
  image,
  sizes,
  className,
  priority = false,
  decorative = false,
  variant = 'normal',
}: {
  image: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
  variant?: 'normal' | 'hero';
}) {
  if (!isImageKey(image)) return null;
  const base = variant === 'hero' ? `/img/${image}-hero` : `/img/${image}`;
  const widths = variant === 'hero' ? HERO_WIDTHS : WIDTHS;
  return (
    <img
      src={`${base}-768.webp`}
      srcSet={widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      width={1408}
      height={768}
      alt={decorative ? '' : IMAGE_ALT[image]}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
