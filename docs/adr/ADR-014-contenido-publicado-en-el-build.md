# ADR-014 – La landing se genera con el contenido publicado

**Contexto.** "Publicar" en el panel debe cambiar la web. La landing es HTML estático prerenderizado
(ADR-011).

**Decisión.**
- `scripts/fetch-content.mjs` corre antes del build, descarga `GET /public/content` (solo la parte de
  contenido de la última publicación, sin precios) y la guarda en
  `src/generated/published-content.json` (no se versiona).
- `src/content.ts` usa ese archivo si existe (`import.meta.glob`, que no falla si no existe). Si no,
  usa `FALLBACK_CONTENT`, el provisorio.
- `REQUIRE_PUBLISHED_CONTENT=true` (en Vercel/producción): si no se puede leer el contenido publicado,
  el **build falla**. Así nunca se publica en silencio el contenido provisorio sobre el del cliente.
  Reintenta 6 veces, con 15 s de espera, por el arranque lento de Render.
- "Publicar" llama al deploy hook de Vercel (`VERCEL_DEPLOY_HOOK_URL`), que recompila la web.

**Verificado.** Con contenido publicado, la landing muestra el texto publicado desde el panel. Con la API
caída y el contenido obligatorio, el build termina con código 1. Sin la API en desarrollo, usa el
contenido provisorio.

**Consecuencias.** Entre "Publicar" y la web actualizada pasa el tiempo de build de Vercel. El
cotizador, en cambio, se actualiza al instante, porque lee la publicación en la API.
