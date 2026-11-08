/**
 * Logotipo oficial de PRIVAT ("privat" + "Gestión de Propiedades"), extraído en vectores del
 * archivo del cliente logo_Privat_05112026.pdf (docs/marca.md). Archivo estático: se cachea y no
 * agrega peso al JavaScript. CSP: img-src 'self'.
 *
 * - "blanco": sobre el verde bosque (menú, pie, encabezado del panel).
 * - "verde": sobre fondos claros (login del panel).
 *
 * `alt` vacío cuando el elemento que lo contiene ya tiene nombre accesible (p. ej. el enlace al inicio).
 */
export function Logo({ variant, className, alt }: { variant: 'blanco' | 'verde'; className?: string; alt: string }) {
  // width/height = proporción real del logotipo (2,8:1); el tamaño final lo da la clase. Evitan saltos de diseño (CLS).
  return <img src={`/logo-privat-${variant}.svg`} width={280} height={100} alt={alt} className={className} decoding="async" />;
}
