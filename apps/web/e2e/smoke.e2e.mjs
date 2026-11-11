// Prueba de punta a punta de la landing (Bloque C) con Playwright + Chromium.
// Requiere: API corriendo con la publicación de prueba (apps/api/test/fixtures/e2e-publication.sql)
// y la web compilada servida con `vite preview`. Ver docs/guia-tecnica.md, sección "Prueba e2e".
//
// Uso: WEB_URL=http://127.0.0.1:4173 SHOTS_DIR=/ruta node e2e/smoke.e2e.mjs
// Si Playwright está instalado globalmente: PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const { devices } = playwright;
// Motor: chromium (por defecto), firefox o webkit (motor de Safari). En el CI se prueban los tres.
const BROWSER = process.env.BROWSER ?? 'chromium';
const engine = playwright[BROWSER];
if (!engine) throw new Error(`BROWSER inválido: ${BROWSER}`);

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const SHOTS_DIR = process.env.SHOTS_DIR;

// Widget Turnstile simulado en el navegador: entrega el token de prueba de Cloudflare.
// La API verifica el token contra Cloudflare de verdad, así que debe RECHAZARLO.
const FAKE_TURNSTILE = `window.turnstile = {
  render: (el, o) => { el.textContent = 'turnstile-simulado'; setTimeout(() => o.callback('XXXX.DUMMY.TOKEN.XXXX'), 10); return 'w1'; },
  reset: () => {}, remove: () => {}
};`;

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`✔ ${name}`);
  } catch (err) {
    results.push(`✖ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

const browser = await engine.launch();
console.log(`Motor: ${BROWSER}`);
try {
  // ---------------- Escritorio ----------------
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: SHOTS_DIR ? 2 : 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE }),
  );

  await step('la página carga con el HTML prerenderizado (H1 visible sin esperar JS)', async () => {
    const res = await page.goto(WEB_URL, { waitUntil: 'domcontentloaded' });
    assert.equal(res.status(), 200);
    const html = await res.text();
    assert.match(html, /<h1[^>]*>Gestión patrimonial inteligente/);
    await page.getByRole('heading', { level: 1 }).waitFor();
  });

  await step('el mapa NO se descarga en la carga inicial', async () => {
    await page.waitForLoadState('networkidle');
    assert.ok(!requested.some((u) => u.includes('MapView')), 'se pidió el chunk del mapa antes de tiempo');
    assert.ok(!requested.some((u) => u.includes('challenges.cloudflare.com')), 'Turnstile se cargó antes de tiempo');
  });

  await step('marca PRIVAT en el título y el encabezado', async () => {
    assert.match(await page.title(), /\| PRIVAT$/);
    await page.locator('header').getByRole('link', { name: /PRIVAT/ }).waitFor();
  });

  await step('banner de contenido provisorio y "Acceso clientes" deshabilitado', async () => {
    await page.getByText('Contenido provisorio').waitFor();
    const access = page.locator('header [aria-disabled="true"]').first();
    await access.waitFor();
    assert.match(await access.innerText(), /Acceso clientes\s*Pronto/);
    const box = await access.boundingBox();
    assert.ok(box.height < 56, `el botón ocupa más de una línea (${box.height}px)`);
  });

  if (SHOTS_DIR) await page.screenshot({ path: `${SHOTS_DIR}/landing-escritorio.png` });

  await step('mapa: se carga al llegar y estima distancia y viático', async () => {
    await page.locator('#cobertura').scrollIntoViewIfNeeded();
    const map = page.getByTestId('coverage-map');
    await map.locator('.leaflet-control-zoom').waitFor({ timeout: 15_000 });
    assert.ok(requested.some((u) => u.includes('MapView')), 'el chunk del mapa no se cargó');
    // El centro inicial del mapa (-32.6, -55.9) está dentro de Uruguay.
    const box = await map.boundingBox();
    const estimate = page.waitForResponse((r) => r.url().endsWith('/public/travel-estimate'));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal((await estimate).status(), 200);
    await page.getByTestId('travel-estimate').waitFor();
    const text = await page.getByTestId('travel-estimate').innerText();
    assert.match(text, /km/);
    assert.match(text, /US\$|USD/);
  });

  if (SHOTS_DIR) {
    await page.locator('#cobertura').screenshot({ path: `${SHOTS_DIR}/mapa-cobertura.png` });
  }

  await step('el menú fijo queda por encima del mapa al hacer scroll', async () => {
    // Leaflet usa z-index 400-1000; el mapa tiene su propio contexto de apilamiento (isolate).
    const result = await page.evaluate(() => {
      const header = document.querySelector('header');
      const zoom = document.querySelector('[data-testid="coverage-map"] .leaflet-control-zoom');
      // Lleva el control de zoom (z-index 1000) justo debajo del menú.
      // behavior 'instant': la página usa scroll-behavior: smooth y si no se mediría antes de moverse.
      window.scrollTo({ top: window.scrollY + zoom.getBoundingClientRect().top - header.getBoundingClientRect().height / 2, behavior: 'instant' });
      const z = zoom.getBoundingClientRect();
      const top = document.elementFromPoint(z.left + z.width / 2, z.top + 2);
      return { covered: Boolean(top?.closest('header')), at: top?.className?.toString().slice(0, 60) };
    });
    assert.ok(result.covered, `el mapa tapa el menú (elemento visible: ${result.at})`);
  });

  await step('cotizador: muestra baja, alta y anual devueltos por la API', async () => {
    await page.getByRole('link', { name: 'Usar en el cotizador' }).click();
    await page.getByLabel('Casa premium 400-700 m²').check();
    await page.getByRole('radio', { name: /Property Management técnico/ }).check();
    const sim = page.waitForResponse((r) => r.url().endsWith('/public/simulations'));
    await page.getByRole('button', { name: 'Ver estimación' }).click();
    const res = await sim;
    assert.equal(res.status(), 200);
    const body = await res.json();
    const result = page.getByTestId('quote-result');
    await result.waitFor();
    const shown = await result.innerText();
    const fmt = (v) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v));
    for (const key of ['lowFee', 'highFee', 'annualFee']) assert.ok(shown.includes(fmt(body[key])), `no se muestra ${key}`);
    assert.match(shown, /Estimación orientativa sujeta a auditoría inicial/);
    // La respuesta pública no trae datos comerciales sensibles.
    assert.ok(!('hourlyRate' in body) && !('premiumPct' in body));
  });

  if (SHOTS_DIR) await page.locator('#cotizador').screenshot({ path: `${SHOTS_DIR}/cotizador-resultado.png` });

  await step('cotizador: sin tarifa publicada informa sin inventar precios', async () => {
    await page.getByLabel('Apartamento en torre').check();
    await page.getByRole('radio', { name: /Cuidador/ }).check();
    await page.getByRole('button', { name: 'Ver estimación' }).click();
    await page.getByText('Todavía no hay una tarifa publicada').waitFor();
  });

  await step('formulario: Turnstile se carga al interactuar y la API rechaza un token no válido', async () => {
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    await page.getByLabel('Nombre y apellido').fill('Prueba E2E');
    await page.getByTestId('turnstile').waitFor();
    await page.getByLabel('Email').fill('e2e@example.com');
    await page.getByLabel(/Acepto que mis datos/).check();
    await page.waitForTimeout(100);
    const lead = page.waitForResponse((r) => r.url().endsWith('/public/leads'));
    await page.getByRole('button', { name: 'Enviar consulta' }).click();
    assert.equal((await lead).status(), 403);
    await page.getByText('No pudimos verificar que la consulta la envía una persona').waitFor();
  });

  await step('la CSP efectiva bloquea scripts inline y estilos inline inyectados', async () => {
    const r = await page.evaluate(() => {
      window.__cspScript = false;
      const sc = document.createElement('script');
      sc.textContent = 'window.__cspScript = true;';
      document.head.appendChild(sc);
      const probe = document.createElement('div');
      probe.setAttribute('style', 'width: 123px');
      document.body.appendChild(probe);
      const width = probe.style.width;
      probe.remove();
      return { script: window.__cspScript, styleAttr: width };
    });
    assert.equal(r.script, false, 'se ejecutó un script inline');
    assert.equal(r.styleAttr, '', 'se aplicó un atributo style inline');
    consoleErrors.splice(0); // las violaciones provocadas por esta prueba no cuentan
  });

  await step('sin errores de consola (salvo teselas de mapa bloqueadas por red)', async () => {
    const relevant = consoleErrors.filter((e) => !/tile\.openstreetmap|ERR_|Failed to load resource/.test(e));
    assert.deepEqual(relevant, []);
  });
  await ctx.close();

  // ---------------- Móvil ----------------
  // Firefox no admite isMobile: se emula solo el tamaño y el agente del teléfono.
  const { isMobile, hasTouch, ...phone } = devices['iPhone 13'];
  const mctx = await browser.newContext(BROWSER === 'firefox' ? phone : { ...phone, isMobile, hasTouch });
  const m = await mctx.newPage();
  await step('móvil: sin scroll horizontal y menú accesible', async () => {
    await m.goto(WEB_URL, { waitUntil: 'networkidle' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `scroll horizontal de ${overflow}px`);
    const btn = m.getByRole('button', { name: 'Menú' });
    assert.equal(await btn.getAttribute('aria-expanded'), 'false');
    await btn.click();
    assert.equal(await m.getByRole('button', { name: 'Cerrar' }).getAttribute('aria-expanded'), 'true');
    await m.locator('#menu-movil').getByRole('link', { name: 'Cotizador' }).waitFor();
  });
  if (SHOTS_DIR) {
    await m.getByRole('button', { name: 'Cerrar' }).click();
    await m.screenshot({ path: `${SHOTS_DIR}/landing-movil.png` });
  }
  await mctx.close();

  await step('API dormida (Render gratuito): avisa, espera y luego calcula sin error', async () => {
    const wctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const w = await wctx.newPage();
    // Como Render mientras despierta: responde una página HTML sin cabeceras CORS durante unos segundos.
    let wakeAt = Infinity;
    await w.route(/127\.0\.0\.1:3000\//, (route) =>
      Date.now() < wakeAt ? route.fulfill({ status: 200, contentType: 'text/html', body: '<html>SERVICE WAKING UP</html>' }) : route.continue(),
    );
    await w.goto(WEB_URL, { waitUntil: 'networkidle' });
    wakeAt = Date.now() + 6_000;
    await w.locator('#cobertura').scrollIntoViewIfNeeded();
    const map = w.getByTestId('coverage-map');
    await map.locator('.leaflet-control-zoom').waitFor({ timeout: 15_000 });
    const box = await map.boundingBox();
    await w.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await w.getByTestId('api-waking').first().waitFor({ timeout: 5_000 });
    await w.getByTestId('travel-estimate').waitFor({ timeout: 30_000 });
    assert.equal(await w.getByTestId('api-waking').count(), 0, 'el aviso debe desaparecer al despertar');
    assert.equal(await w.getByText('No pudimos conectar con el servidor').count(), 0);
    await wctx.close();
  });
} finally {
  await browser.close();
}

console.log(results.join('\n'));
