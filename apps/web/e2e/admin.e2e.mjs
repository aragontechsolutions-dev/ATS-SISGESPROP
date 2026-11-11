// Prueba e2e del panel /admin (Bloque D) con Playwright + Chromium.
// Requiere: fake-supabase-auth.mjs (puerto 54321), la API con SUPABASE_URL apuntando a él
// y la base e2e (seed + e2e-publication.sql), y la web compilada servida con `vite preview`.
// Ver docs/guia-tecnica.md, "Prueba e2e del panel".
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000';
const FAKE_AUTH_URL = process.env.FAKE_AUTH_URL ?? 'http://127.0.0.1:54321';
const SHOTS_DIR = process.env.SHOTS_DIR;
const USER = { email: 'e2e@test.local', password: 'Clave-de-prueba-1' };

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`✔ ${name}`);
  } catch (err) {
    results.push(`✖ ${name}: ${err.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: SHOTS_DIR ? 2 : 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('dialog', (d) => void d.accept());

  await step('el panel pide login y no indexa', async () => {
    await page.goto(`${WEB_URL}/admin/`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Ingresar al panel' }).waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  });

  await step('contraseña incorrecta: mensaje genérico', async () => {
    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByText('Email o contraseña incorrectos.').waitFor();
  });

  await step('primer ingreso: alta del segundo factor con QR', async () => {
    await page.getByLabel('Contraseña', { exact: true }).fill(USER.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('heading', { name: 'Segundo factor' }).waitFor();
    await page.getByAltText('Código QR para la app autenticadora').waitFor();
  });

  await step('código incorrecto rechazado; correcto da acceso', async () => {
    await page.getByLabel('Código').fill('000000');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await page.getByText('Código incorrecto o vencido.').waitFor();
    await page.getByLabel('Código').fill('123456');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await page.getByRole('heading', { name: 'Contenidos' }).waitFor();
    await page.getByText(USER.email).waitFor();
  });

  await step('la sesión está en sessionStorage, no en localStorage', async () => {
    const stores = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.ok(!stores.local.some((k) => k.startsWith('sb-')), `localStorage: ${stores.local}`);
    assert.ok(stores.session.some((k) => k.startsWith('sb-')), 'no hay sesión en sessionStorage');
  });

  await step('contenidos: editar y guardar una sección en borrador', async () => {
    await page.getByRole('button', { name: 'Portada (hero)' }).click();
    const cta = page.getByLabel('Botón principal');
    await cta.fill('Solicitar diagnóstico gratuito');
    await page.getByRole('button', { name: 'Guardar borrador' }).first().click();
    await page.getByText('Guardado en borrador.').first().waitFor();
  });

  await step('contenidos: el servidor rechaza una URL no https', async () => {
    await page.getByRole('button', { name: 'Pie de página' }).click();
    await page.getByLabel('URL de la política de privacidad (https)').fill('http://inseguro.uy');
    await page.getByRole('button', { name: 'Guardar borrador' }).first().click();
    await page.getByText(/debe empezar con https/).waitFor();
  });

  if (SHOTS_DIR) await page.screenshot({ path: `${SHOTS_DIR}/admin-contenidos.png` });

  await step('precios: configurar perfil Casa premium nivel 3', async () => {
    await page.getByRole('button', { name: 'Precios y viáticos' }).click();
    await page.getByRole('button', { name: /Configurar Casa premium 400-700 m² nivel 3/ }).click();
    const values = { 'Visitas por mes': '4', 'Horas por visita': '2', 'Horas de traslado por visita': '1', 'Horas de administración (mes)': '5', 'Horas de coordinación (mes)': '4', 'Horas de gestión de personal (mes)': '2', 'Valor hora (USD)': '40', 'Gastos fijos (USD/mes)': '90', Prima: '0.2', 'Coeficiente de temporada alta': '2', 'Meses de temporada alta': '2.5' };
    for (const [label, v] of Object.entries(values)) await page.getByLabel(label, { exact: true }).fill(v);
    await page.getByRole('button', { name: 'Guardar perfil' }).click();
    await page.getByRole('button', { name: /40 USD\/h, editar Casa premium 400-700 m² nivel 3/ }).waitFor();
  });

  await step('base de operaciones: buscar dirección, rechazar fuera de Uruguay, coordenadas, clic y guardar', async () => {
    // Nominatim simulado: la prueba no depende de un servicio externo.
    const searches = [];
    await page.route('https://nominatim.openstreetmap.org/**', (route) => {
      searches.push(new URL(route.request().url()));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { display_name: 'Rambla Claudio Williman, Punta del Este, Maldonado, Uruguay', lat: '-34.9606', lon: '-54.9489' },
          { display_name: 'Avenida de Mayo, Buenos Aires, Argentina', lat: '-34.6037', lon: '-58.3816' },
        ]),
      });
    });
    await page.getByLabel('Nombre de la base').fill('Base de prueba (centro)');
    const map = page.getByTestId('base-map');
    await map.locator('.leaflet-control-zoom').waitFor();
    await page.getByLabel('Buscar dirección').fill('Rambla Punta del Este');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('button', { name: /Avenida de Mayo/ }).click();
    await page.getByText('La base debe estar dentro de Uruguay.').waitFor();
    await page.getByRole('button', { name: /Rambla Claudio Williman/ }).click();
    await page.getByText('Ubicación: -34.96060, -54.94890').waitFor();
    assert.equal(searches[0].searchParams.get('countrycodes'), 'uy');
    await map.locator('.base-marker').waitFor();
    await page.getByLabel('Latitud de la base').fill('-34.95');
    await page.getByLabel('Longitud de la base').fill('-54.93');
    await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
    await page.getByText('Ubicación: -34.95000, -54.93000').waitFor();
    const box = await map.boundingBox();
    await page.mouse.click(box.x + box.width / 3, box.y + box.height / 3);
    await page.getByText(/Ubicación: -3\d\.\d+/).waitFor();
    await page.getByRole('button', { name: 'Guardar viáticos' }).click();
    await page.getByText('Viáticos guardados en borrador.').waitFor();
  });

  await step('simulación de prueba con el borrador', async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Precios y viáticos' }).click();
    await page.getByLabel('Tipo').selectOption('CASA_PREMIUM');
    await page.getByLabel('Nivel', { exact: true }).selectOption('3');
    await page.getByRole('button', { name: 'Simular' }).click();
    const r = page.getByTestId('test-sim-result');
    await r.waitFor();
    // En la base (distancia 0): (23 × 40 + 90) × 1,2 = 1212
    assert.match(await r.innerText(), /1212\.00/);
  });

  if (SHOTS_DIR) await page.screenshot({ path: `${SHOTS_DIR}/admin-precios.png`, fullPage: true });

  await step('el borrador NO llega al cotizador público hasta publicar', async () => {
    const before = await (await fetch(`${API_URL}/public/coverage`)).json();
    assert.notEqual(before.baseLabel, 'Base de prueba (centro)');
  });

  await step('publicar: el cotizador público usa lo publicado', async () => {
    await page.getByRole('button', { name: 'Publicar' }).first().click();
    await page.getByRole('button', { name: 'Publicar', exact: true }).last().click();
    await page.getByText('Publicado.').waitFor();
    const cov = await (await fetch(`${API_URL}/public/coverage`)).json();
    assert.equal(cov.baseLabel, 'Base de prueba (centro)');
    const content = await (await fetch(`${API_URL}/public/content`)).json();
    assert.equal(content.content.sections.hero.cta, 'Solicitar diagnóstico gratuito');
    await page.getByText('(vigente)').waitFor();
  });

  await step('consultas y registro de cambios', async () => {
    await page.getByRole('button', { name: 'Consultas' }).click();
    await page.getByRole('heading', { name: 'Consultas recibidas' }).waitFor();
    await page.getByRole('button', { name: 'Registro de cambios' }).click();
    await page.getByText(/PUBLISH · publication/).first().waitFor();
    await page.getByText(/UPDATE · content_block hero/).first().waitFor();
  });

  await step('salir vuelve al login', async () => {
    await page.getByRole('button', { name: 'Salir' }).click();
    await page.getByRole('heading', { name: 'Ingresar al panel' }).waitFor();
  });

  await step('ojo de la contraseña: muestra y oculta lo escrito', async () => {
    const pass = page.getByLabel('Contraseña', { exact: true });
    await pass.fill('visible-123');
    assert.equal(await pass.getAttribute('type'), 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    assert.equal(await pass.getAttribute('type'), 'text');
    assert.equal(await page.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    assert.equal(await pass.getAttribute('type'), 'password');
    await pass.fill('');
  });

  const NEW_PASSWORD = 'Nueva-clave-segura-2026';
  await step('recuperar contraseña: código por email + segundo factor', async () => {
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await page.getByRole('heading', { name: 'Recuperar contraseña' }).waitFor();
    await page.getByLabel('Email').fill(USER.email);
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.getByText(/Si el email corresponde a una cuenta del panel/).waitFor();
    await page.getByLabel('Código del email').fill('000000');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByText('Código incorrecto o vencido. Puedes pedir uno nuevo.').waitFor();
    await page.getByLabel('Código del email').fill('654321');
    await page.getByRole('button', { name: 'Continuar' }).click();
    // Con solo el código del email NO se puede cambiar la contraseña: pide el 2FA.
    await page.getByRole('heading', { name: 'Segundo factor' }).waitFor();
    await page.getByLabel('Código', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await page.getByRole('heading', { name: 'Nueva contraseña' }).waitFor();
  });

  await step('recuperar contraseña: validaciones y cambio', async () => {
    const pass = page.getByLabel('Contraseña nueva', { exact: true });
    const confirm = page.getByLabel('Repite la contraseña nueva', { exact: true });
    await pass.fill('corta');
    await confirm.fill('corta');
    await pass.evaluate((el) => el.removeAttribute('minlength'));
    await confirm.evaluate((el) => el.removeAttribute('minlength'));
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByText('La contraseña debe tener al menos 12 caracteres.').waitFor();
    await pass.fill(NEW_PASSWORD);
    await confirm.fill(`${NEW_PASSWORD}x`);
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByText('Las contraseñas no coinciden.').waitFor();
    await pass.fill(USER.password);
    await confirm.fill(USER.password);
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByText('La contraseña nueva debe ser distinta de la anterior.').waitFor();
    await pass.fill(NEW_PASSWORD);
    await confirm.fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByRole('heading', { name: 'Ingresar al panel' }).waitFor();
    await page.getByText(/Contraseña actualizada/).waitFor();
  });

  await step('la contraseña vieja ya no sirve; la nueva + 2FA da acceso', async () => {
    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(USER.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByText('Email o contraseña incorrectos.').waitFor();
    await page.getByLabel('Contraseña', { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByLabel('Código', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await page.getByRole('heading', { name: 'Contenidos' }).waitFor();
  });

  await step('sin errores de consola relevantes', async () => {
    // Los 400/422 esperados del login y del código incorrecto se registran como recursos fallidos.
    const relevant = consoleErrors.filter((e) => !/Failed to load resource|tile\.openstreetmap|ERR_/.test(e));
    assert.deepEqual(relevant, []);
  });
} finally {
  await browser.close();
  // Deja el Auth simulado con la contraseña original para a11y.e2e.mjs.
  await fetch(`${FAKE_AUTH_URL}/__test__/reset-password`, { method: 'POST' }).catch(() => {});
}
console.log(results.join('\n'));
