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

**Alternativas descartadas.**
- **"Usar mi ubicación" (geolocalización):** exigiría abrir `Permissions-Policy: geolocation`,
  hoy bloqueada en todo el sitio.
- **Servicios de geocodificación con clave** (Google, Mapbox): costo, otra cuenta y una clave en el
  navegador.

**Verificado.**
- e2e del panel con Nominatim simulado: búsqueda, rechazo de un resultado fuera de Uruguay,
  coordenadas manuales, clic y guardado.
- axe sin violaciones.
