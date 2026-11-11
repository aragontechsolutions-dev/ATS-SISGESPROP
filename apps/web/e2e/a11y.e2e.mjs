// Accesibilidad automatizada (WCAG 2.0/2.1/2.2 A y AA) con axe-core 4.14 sobre cada
// estado de la landing y cada pantalla del panel. Requiere el mismo entorno que
// admin.e2e.mjs (API, Auth simulado y web servida). Reiniciar el Auth simulado antes.
//
// Nota: axe detecta automáticamente una parte de los problemas de accesibilidad
// (no todos). La revisión manual con teclado y lector de pantalla sigue siendo necesaria.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const results = [];
async function audit(page, name) {
  await page.addScriptTag({ path: AXE_PATH });
  const r = await page.evaluate(async (tags) => {
    // eslint-disable-next-line no-undef
    const out = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return out.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 3) }));
  }, TAGS);
  if (r.length === 0) results.push(`✔ ${name}: sin violaciones`);
  else {
    process.exitCode = 1;
    results.push(`✖ ${name}: ${r.length} violación(es)`);
    for (const v of r) results.push(`    - [${v.impact}] ${v.id}: ${v.help} → ${v.nodes.join(' | ')}`);
  }
}

const browser = await chromium.launch();
try {
  // bypassCSP: solo para inyectar el script de axe en la prueba (la CSP real no se modifica).
  for (const [label, viewport] of [['escritorio', { width: 1366, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, bypassCSP: true });
    const page = await ctx.newPage();
    await page.route('https://challenges.cloudflare.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.turnstile={render:()=>"w",reset(){},remove(){}};' }),
    );
    await page.goto(WEB_URL, { waitUntil: 'networkidle' });
    await audit(page, `landing inicial (${label})`);

    await page.locator('#cobertura').scrollIntoViewIfNeeded();
    const map = page.getByTestId('coverage-map');
    await map.locator('.leaflet-control-zoom').waitFor();
    const box = await map.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByTestId('travel-estimate').waitFor();
    await page.getByLabel('Casa premium 400-700 m²').check();
    await page.getByRole('radio', { name: /Property Management técnico/ }).check();
    await page.getByRole('button', { name: 'Ver estimación' }).click();
    await page.getByTestId('quote-result').waitFor();
    await page.getByLabel('Nombre y apellido').fill('Prueba');
    await page.getByTestId('turnstile').waitFor({ state: 'attached' });
    await audit(page, `landing con mapa, resultado y formulario (${label})`);
    const faq = page.getByTestId('faq');
    await faq.getByRole('button', { name: 'Propietarios en el exterior' }).click();
    await faq.getByRole('button', { name: /Vivo fuera de Uruguay/ }).click();
    await audit(page, `landing con preguntas frecuentes abiertas (${label})`);
    if (label === 'móvil') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole('button', { name: 'Menú' }).click();
      await audit(page, 'landing con menú móvil abierto');
    }
    await ctx.close();
  }

  // ---------------- Teclado (axe no lo cubre) ----------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(WEB_URL, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = el ? getComputedStyle(el) : null;
      return { text: el?.textContent?.trim(), outline: cs ? `${cs.outlineStyle} ${cs.outlineWidth}` : '' };
    });
    const skipOk = first.text === 'Saltar al contenido' && first.outline.startsWith('solid 3px');
    results.push(`${skipOk ? '✔' : '✖'} teclado: primer Tab = "Saltar al contenido" con foco visible (${first.outline})`);
    if (!skipOk) process.exitCode = 1;
    await page.keyboard.press('Enter');
    const inMain = await page.evaluate(() => location.hash === '#contenido');
    results.push(`${inMain ? '✔' : '✖'} teclado: el enlace lleva al contenido principal`);
    if (!inMain) process.exitCode = 1;
    let reached = false;
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => document.activeElement?.getAttribute('name') === 'propertyType');
    }
    results.push(`${reached ? '✔' : '✖'} teclado: se llega a los controles del cotizador con Tab`);
    if (!reached) process.exitCode = 1;
    await ctx.close();
  }

  // ---------------- Panel ----------------
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, bypassCSP: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  await page.goto(`${WEB_URL}/admin/`, { waitUntil: 'networkidle' });
  await audit(page, 'panel: login');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await audit(page, 'panel: login con la contraseña visible');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByRole('heading', { name: 'Recuperar contraseña' }).waitFor();
  await audit(page, 'panel: recuperar contraseña');
  await page.getByRole('button', { name: 'Volver' }).click();
  await page.getByLabel('Email').fill('e2e@test.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave-de-prueba-1');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('heading', { name: 'Segundo factor' }).waitFor();
  await audit(page, 'panel: segundo factor (alta con QR)');
  await page.getByLabel('Código').fill('123456');
  await page.getByRole('button', { name: 'Verificar' }).click();
  try {
    await page.getByRole('heading', { name: 'Contenidos' }).waitFor({ timeout: 15_000 });
  } catch (e) {
    console.log('PANTALLA:', (await page.locator('body').innerText()).slice(0, 400));
    throw e;
  }
  await audit(page, 'panel: Contenidos');
  for (const [tab, heading] of [['Precios y viáticos', 'Precios y viáticos'], ['Consultas', 'Consultas recibidas'], ['Publicar', 'Publicar'], ['Registro de cambios', 'Registro de cambios']]) {
    await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('button', { name: tab }).click();
    await page.getByRole('heading', { level: 1, name: heading }).waitFor();
    await page.waitForLoadState('networkidle');
    await audit(page, `panel: ${tab}`);
  }
  await ctx.close();
} finally {
  await browser.close();
}
console.log(results.join('\n'));
