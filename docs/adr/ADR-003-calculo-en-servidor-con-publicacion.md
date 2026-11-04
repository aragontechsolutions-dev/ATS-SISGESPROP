# ADR-003 – Cotizador en el servidor con la última publicación

**Contexto.** El valor hora y la prima son información comercial sensible. El plan exige borrador y
publicación para que un error de tipeo no llegue a la web al instante.

**Decisión.** El cálculo se hace en la API. El navegador envía tipo, nivel y coordenadas, y recibe solo
totales, distancia y viático. Los parámetros se leen de la última fila de `publication` (snapshot
inmutable), nunca de las tablas de borrador. Sin publicación, el cotizador responde 503.

**Consecuencias.** La landing depende de la API solo para cotizar: el resto se sirve estático. Para
evitar demoras por suspensión, Render debe estar en plan pago.
