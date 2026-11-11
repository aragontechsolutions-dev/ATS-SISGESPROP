# Marca PRIVAT – logo y uso en el sistema

**Fuente:** `logo_Privat_05112026.pdf`, entregado por el cliente el 08/11/2026 y exportado desde
Affinity 3.3.3. Contiene:
- el logo en un círculo **verde bosque** (`#183D32`);
- el logo en un círculo **dorado apagado** (`#B7A06A`);
- el logotipo sin círculo ("privat" + "Gestión de Propiedades");
- la paleta: verde bosque `#183D32`, dorado apagado `#B7A06A`, crema `#F5F1E8`, blanco `#FFFFFF`
  y gris cálido `#686B67`. Es **la misma que ya usaba la web**.
- la dirección visual: elegante, confiable, patrimonial, contemporánea.

## Archivos derivados (`apps/web/public/`)

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `logo-privat-blanco.svg` | Logotipo en blanco | Menú y pie de la landing, encabezado del panel |
| `logo-privat-verde.svg` | Logotipo en verde `#183D32` | Login del panel (fondo blanco) |
| `favicon.svg` | Círculo verde oficial con el logotipo en blanco | Ícono de la pestaña |
| `apple-touch-icon.png` | El mismo círculo, 180×180 px | Acceso directo en iPhone/iPad (iOS no usa SVG) |

Copia del círculo en `docs/marca/logo-privat-circulo.svg`.

**Cómo se generaron.** No se redibujó nada:
- el PDF es vectorial y los textos vienen convertidos a curvas;
- se convirtió a SVG con `pdftocairo` y se separaron los trazados de cada versión;
- en el logotipo se unificó el color: el PDF traía grises casi negros, restos de la exportación;
- las coordenadas se redondearon a 2 decimales y el recorte se midió en el navegador (`getBBox`).

Proporción del logotipo: **2,8 : 1**.

**Uso en el código.** El componente `apps/web/src/components/Logo.tsx` usa siempre `<img>` con
ancho y alto declarados, para evitar saltos de diseño. Es un archivo estático: se cachea y no suma
peso al JavaScript. La CSP no cambia (`img-src 'self'`).

**Accesibilidad.**
- En el menú, el enlace ya se llama "PRIVAT, ir al inicio", así que la imagen lleva `alt=""`.
- En el pie y en el login, `alt="PRIVAT Gestión de Propiedades"`.
- Verificado con axe: 17/17.

## Imágenes del sitio (entrega del 11/11/2026)

- **Origen:** 16 imágenes del cliente: 10 de propiedades y 6 de servicios.
  - **Al menos una** (la casa en el bosque) **está generada con IA**: trae una credencial C2PA de
    Google, `trainedAlgorithmicMedia`.
  - **Son ilustrativas.** No se presentan como propiedades administradas por PRIVAT ni como su
    equipo; las personas con chaleco no son el equipo y los logos de los chalecos no son el de
    PRIVAT.
- **Archivos:** `apps/web/public/img/<clave>-{480,768,1408}.webp` (calidad 70) y
  `<clave>-hero-{768,1408}.webp` (calidad 40, solo para la portada).
  - Sin metadatos (EXIF, C2PA e ICC eliminados).
  - Codificadas con Pillow 12.3, porque ImageMagick 6.9 de este entorno ignoraba la calidad WebP.
- **Catálogo:** `apps/web/src/images.ts`, con las claves, los textos alternativos y la imagen de
  cada nivel. La API acepta solo esas claves (ADR-018).
- **Para agregar una imagen hasta que exista D4:**
  1. convertirla con el mismo procedimiento;
  2. sumar la clave en `images.ts` y en `IMAGE_KEYS` de `content-schema.ts`;
  3. agregar su texto alternativo.

## Pendiente de decidir con el cliente

- **Tipografía de la web.** El texto "Gestión de Propiedades" del logo parece Montserrat, pero
  **no está confirmado**, y "privat" es un diseño propio. La web sigue con la fuente del sistema
  (cero descargas). Si el cliente quiere unificar, que confirme la fuente; se alojaría en
  privatgp.com, no en Google Fonts, por privacidad y por la CSP.
- **Logo en los emails.** Hoy los correos muestran "PRIVAT" en texto (docs/emails.md): muchos
  clientes de correo bloquean las imágenes y Gmail no muestra SVG. Si se quiere el logo, sería un
  PNG alojado en privatgp.com, con el texto como respaldo.
- **Imagen para redes sociales** (`og:image`, la vista previa al compartir el enlace): se puede
  armar con el círculo cuando el cliente lo apruebe.
- **Versión dorada del círculo.** Está en el PDF y no se usa todavía.
