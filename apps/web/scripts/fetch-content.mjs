// Descarga el contenido PUBLICADO desde la API (GET /public/content) antes del build,
// para que el prerender genere la landing con lo último publicado desde el panel.
//
// - Publicado -> src/generated/published-content.json (lo usa src/content.ts).
// - Sin publicación (404) o API inaccesible:
//     * REQUIRE_PUBLISHED_CONTENT=true (producción) -> el build FALLA. Así nunca se
//       publica en silencio el contenido provisorio pisando el del cliente.
//     * si no -> se usa el contenido provisorio de src/content.ts (desarrollo / CI).
// Reintenta porque la API en Render puede tardar ~1 minuto en despertar.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'src/generated');
const outFile = path.join(outDir, 'published-content.json');
const apiUrl = (process.env.VITE_API_URL ?? '').replace(/\/$/, '');
const required = process.env.REQUIRE_PUBLISHED_CONTENT === 'true';
const ATTEMPTS = Number(process.env.FETCH_CONTENT_ATTEMPTS ?? (required ? 6 : 1));

function fail(msg) {
  if (required) {
    console.error(`✖ ${msg} (REQUIRE_PUBLISHED_CONTENT=true: el build se detiene)`);
    process.exit(1);
  }
  console.warn(`⚠ ${msg}. Se usa el contenido provisorio de src/content.ts.`);
}

/** Validación mínima de forma: la API ya validó cada sección con su esquema. */
function looksValid(c) {
  const keys = ['settings', 'brand', 'seo', 'nav', 'hero', 'services', 'transparency', 'coverage', 'quoter', 'contact', 'footer'];
  return c && typeof c === 'object' && c.sections && keys.every((k) => typeof c.sections[k] === 'object') && Array.isArray(c.services);
}

await rm(outFile, { force: true });
if (!apiUrl) {
  fail('VITE_API_URL no definida');
} else {
  let result = null;
  for (let i = 1; i <= ATTEMPTS && !result; i++) {
    try {
      const res = await fetch(`${apiUrl}/public/content`, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) {
        result = { kind: 'none' };
      } else if (res.ok) {
        result = { kind: 'ok', body: await res.json() };
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`Intento ${i}/${ATTEMPTS}: no se pudo leer ${apiUrl}/public/content (${err.message})`);
      if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 15_000));
    }
  }
  if (!result) fail('La API no respondió');
  else if (result.kind === 'none') fail('Todavía no hay contenido publicado');
  else if (!looksValid(result.body.content)) fail('El contenido publicado tiene un formato inesperado');
  else {
    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, JSON.stringify(result.body));
    console.log(`Contenido publicado descargado (publicación ${result.body.publicationId}, ${result.body.publishedAt}).`);
  }
}
