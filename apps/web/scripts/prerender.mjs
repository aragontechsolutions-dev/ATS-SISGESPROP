// Prerender (SSG): genera dist/client/index.html con el HTML de la landing ya renderizado,
// los metadatos SEO, datos estructurados y el sitemap. La web se sirve como archivos
// estáticos desde la red de Vercel y no depende de que la API esté despierta.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const clientDir = path.join(root, 'dist/client');
const serverEntry = path.join(root, 'dist/server/entry-server.js');

const siteUrl = (process.env.VITE_SITE_URL ?? '').replace(/\/$/, '');

// Content-Security-Policy como <meta> (depende de la URL de la API de cada entorno).
// frame-ancestors no funciona en <meta>: va como cabecera en vercel.json.
const apiOrigin = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : null;
if (!apiOrigin) throw new Error('VITE_API_URL es obligatoria para generar la CSP');
const csp = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  `connect-src 'self' ${apiOrigin}`,
  "img-src 'self' data: https://tile.openstreetmap.org",
  // Leaflet y React posicionan elementos con atributos style: requiere 'unsafe-inline' en estilos (no en scripts).
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const { render, content } = await import(serverEntry);

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// JSON dentro de <script>: se escapa "<" para que ningún texto pueda cerrar la etiqueta.
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

const { seo, brand } = content;
const title = `${seo.title} | ${brand.name}`;
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: brand.name,
  description: seo.description,
  areaServed: { '@type': 'Country', name: 'Uruguay' },
  ...(siteUrl ? { url: `${siteUrl}/` } : {}),
  ...(content.contact.email ? { email: content.contact.email } : {}),
  ...(content.contact.phone ? { telephone: content.contact.phone } : {}),
};

const head = [
  `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}" />`,
  `<title>${escapeHtml(title)}</title>`,
  `<meta name="description" content="${escapeHtml(seo.description)}" />`,
  content.provisional ? '<meta name="robots" content="noindex, nofollow" />' : '',
  siteUrl ? `<link rel="canonical" href="${escapeHtml(siteUrl)}/" />` : '',
  `<meta property="og:type" content="website" />`,
  `<meta property="og:locale" content="es_UY" />`,
  `<meta property="og:title" content="${escapeHtml(title)}" />`,
  `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
  siteUrl ? `<meta property="og:url" content="${escapeHtml(siteUrl)}/" />` : '',
  `<script type="application/ld+json">${safeJson(structuredData)}</script>`,
]
  .filter(Boolean)
  .join('\n    ');

const template = await readFile(path.join(clientDir, 'index.html'), 'utf8');
if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
  throw new Error('La plantilla index.html no tiene los marcadores de prerender');
}
const html = template.replace('<!--app-head-->', head).replace('<!--app-html-->', render());
await writeFile(path.join(clientDir, 'index.html'), html);

if (siteUrl) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeHtml(siteUrl)}/</loc></url>
</urlset>
`;
  await writeFile(path.join(clientDir, 'sitemap.xml'), sitemap);
  const robots = await readFile(path.join(clientDir, 'robots.txt'), 'utf8');
  await writeFile(path.join(clientDir, 'robots.txt'), `${robots.trim()}\nSitemap: ${siteUrl}/sitemap.xml\n`);
}

// ---------------- Panel /admin (no se prerenderiza: solo su CSP) ----------------
// Sin Turnstile; se conecta a la API y a Supabase Auth; img data: para el QR del 2FA.
const supabaseOrigin = process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).origin : null;
const adminCsp = [
  "default-src 'self'",
  "script-src 'self'",
  `connect-src 'self' ${apiOrigin}${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`,
  "img-src 'self' data: https://tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
].join('; ');
const adminPath = path.join(clientDir, 'admin/index.html');
const adminHtml = await readFile(adminPath, 'utf8');
if (!adminHtml.includes('<!--app-head-->')) throw new Error('admin/index.html sin marcador <!--app-head-->');
await writeFile(adminPath, adminHtml.replace('<!--app-head-->', `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(adminCsp)}" />`));

// El bundle de servidor solo sirve para el build: no se publica.
await rm(path.join(root, 'dist/server'), { recursive: true, force: true });
console.log(`Prerender OK: ${path.relative(root, path.join(clientDir, 'index.html'))}${siteUrl ? ' + sitemap.xml' : ' (sin VITE_SITE_URL: sin sitemap ni canonical)'}`);
