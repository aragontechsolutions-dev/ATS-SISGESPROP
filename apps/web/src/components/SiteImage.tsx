import { content } from '../content';
import { IMAGE_ALT, isImageKey, resolveMedia } from '../images';

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
  const widths = variant === 'hero' ? HERO_WIDTHS : WIDTHS;
  let url: (w: number) => string;
  let alt: string;
  if (isImageKey(image)) {
    // Imagen fija incluida en la web: /img/<clave>[-hero]-<ancho>.webp
    const base = variant === 'hero' ? `/img/${image}-hero` : `/img/${image}`;
    url = (w) => `${base}-${w}.webp`;
    alt = IMAGE_ALT[image];
  } else {
    // Imagen subida desde el panel (Etapa D4): <carpeta pública>/[hero-]<ancho>.webp
    const media = resolveMedia(image, content.media);
    if (!media) return null;
    url = (w) => `${media.baseUrl}${variant === 'hero' ? 'hero-' : ''}${w}.webp`;
    alt = media.alt;
  }
  return (
    <img
      src={url(768)}
      srcSet={widths.map((w) => `${url(w)} ${w}w`).join(', ')}
      sizes={sizes}
      width={1408}
      height={768}
      alt={decorative ? '' : alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
