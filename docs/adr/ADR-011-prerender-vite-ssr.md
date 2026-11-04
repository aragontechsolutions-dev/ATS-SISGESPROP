# ADR-011 – Prerender de la landing con el SSR nativo de Vite

**Contexto.** El plan marcaba como riesgo que la herramienta de prerender para Vite no estuviera
validada (día 5). Una SPA envía HTML vacío: peor carga inicial y peor SEO.

**Decisión.** No se usa un plugin de terceros. El build hace:
1. `vite build` del cliente;
2. `vite build --ssr src/entry-server.tsx`;
3. `scripts/prerender.mjs`, que llama `renderToString` e inyecta el HTML, `<title>`, descripción,
   Open Graph, canonical, datos estructurados (JSON-LD con `<` escapado) y la CSP en
   `dist/client/index.html`, y además genera `sitemap.xml` y `robots.txt`.

El cliente hidrata con `hydrateRoot`. El bundle de servidor se borra al terminar (no se publica).

- Mientras `content.provisional` sea `true`, la página lleva `noindex, nofollow`, para que no se
  indexen textos no aprobados.
- El mapa (Leaflet, 62 KB gzip) y Turnstile se cargan de forma diferida; no forman parte de la carga
  inicial (verificado en la prueba e2e).

**Consecuencias.** La landing es HTML estático en Vercel y no depende de que la API esté despierta. En el
Bloque D, `content.ts` se reemplazará por el contenido publicado desde el panel y "Publicar" disparará
un nuevo build en Vercel.
