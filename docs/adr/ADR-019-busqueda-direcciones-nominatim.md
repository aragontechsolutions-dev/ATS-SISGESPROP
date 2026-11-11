# ADR-019 – Mapa de la base de operaciones con búsqueda de direcciones (Nominatim)

**Contexto (11/11/2026).** Se pidió un mapa en el panel para ubicar la base de operaciones. El mapa
anterior solo permitía hacer clic sobre Uruguay entero, sin búsqueda ni precisión.

**Decisión.** `apps/web/src/admin/BaseLocationMap.tsx`, de carga diferida:
- **Búsqueda de direcciones con Nominatim (OpenStreetMap)**, restringida a Uruguay
  (`countrycodes=uy`).
  - Busca solo al pulsar "Buscar": la política de uso de Nominatim prohíbe autocompletar. Hay una
    espera mínima de 1,5 s entre búsquedas.
  - **Datos enviados:** solo el texto buscado (la dirección de la empresa, no datos personales) y el
    origen del panel.
  - **De la respuesta** se usan tres campos validados (nombre, latitud y longitud); se muestran como
    texto (React escapa).
- **Marcador arrastrable** (`divIcon` sin imágenes externas), clic en el mapa y **coordenadas
  manuales**, que además son la alternativa de teclado al mapa.
- **Dentro de Uruguay:** se valida en el navegador para responder al instante, y la API vuelve a
  validar al guardar.
- **CSP del panel:** `connect-src` suma `https://nominatim.openstreetmap.org`. La CSP de la landing
  no cambia.
- **Atribución** a OpenStreetMap (exigida por su licencia).
- **Referer (corrección del 11/11/2026, detectada en producción):** el panel declara
  `<meta name="referrer" content="no-referrer">` para no enviar nunca su dirección a terceros. Pero
  los servidores de OpenStreetMap (teselas y Nominatim) **exigen** un Referer: sin él responden 403
  "Access blocked – App is not following the tile usage policy" y el mapa se ve en blanco.
  - Solo las teselas de este mapa (`referrerPolicy` de Leaflet) y la búsqueda (`fetch`) usan
    `strict-origin`: envían únicamente el origen (`https://privatgp.com/`), nunca la ruta ni el
    fragmento, y nada si la conexión bajara de HTTPS a HTTP.
  - El resto del panel sigue con `no-referrer`.
  - No se detectó antes porque el entorno de pruebas no tiene acceso a las teselas reales (el mapa se
    veía gris y se atribuyó a la red). Ahora el e2e verifica el Referer que recibe Nominatim, la
    política de las teselas y que el documento siga en `no-referrer`.

**Alternativas descartadas.**
- **"Usar mi ubicación" (geolocalización):** exigiría abrir `Permissions-Policy: geolocation`,
  hoy bloqueada en todo el sitio.
- **Servicios de geocodificación con clave** (Google, Mapbox): costo, otra cuenta y una clave en el
  navegador.

**Verificado.**
- e2e del panel con Nominatim simulado: búsqueda, rechazo de un resultado fuera de Uruguay,
  coordenadas manuales, clic y guardado.
- axe sin violaciones.
- e2e del panel: Nominatim recibe solo el origen como Referer; teselas con `referrerPolicy`
  `strict-origin`; documento del panel con `no-referrer`.
