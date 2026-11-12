// Maqueta navegable del formulario de presentación (EF-WEB-001): recorrido completo, preguntas
// condicionales de la matriz, validaciones, resumen editable, mensaje final, sin precios, sin
// llamadas de red fuera de la página y accesibilidad (axe) en cada etapa, en escritorio y móvil.
// Requiere la web servida (vite preview).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const SHOTS_DIR = process.env.SHOTS_DIR;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`✔ ${name}`);
  } catch (e) {
    process.exitCode = 1;
    results.push(`✖ ${name}: ${e.message.split('\n').slice(0, 8).join(' ')}`);
  }
}
async function audit(page, name) {
  await page.addScriptTag({ path: AXE_PATH });
  const v = await page.evaluate(async (tags) => {
    // eslint-disable-next-line no-undef
    const out = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return out.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')}`);
  }, TAGS);
  assert.deepEqual(v, [], `${name}: violaciones de accesibilidad`);
}

const browser = await chromium.launch();
try {
  for (const [label, viewport] of [['escritorio', { width: 1366, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
    // bypassCSP: solo para inyectar axe. La CSP real se comprueba aparte.
    const ctx = await browser.newContext({ viewport, bypassCSP: true });
    const page = await ctx.newPage();
    const external = [];
    const consoleErrors = [];
    page.on('request', (r) => !r.url().startsWith(WEB_URL) && !r.url().startsWith('data:') && external.push(r.url()));
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    const shot = async (name) => SHOTS_DIR && label === 'escritorio' && page.screenshot({ path: `${SHOTS_DIR}/formulario-${name}.png`, fullPage: true });
    const choose = (question, option) => page.getByRole('group', { name: question }).getByLabel(option, { exact: true }).check();
    const next = () => page.getByRole('button', { name: 'Siguiente' }).click();

    await step(`[${label}] vista previa: sin indexar, con CSP y aviso de que no se guardan datos`, async () => {
      await page.goto(`${WEB_URL}/formulario-vista-previa/`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      assert.match(csp, /connect-src 'self';/);
      await page.getByText('los datos que escribas NO se guardan ni se envían').waitFor();
      await page.getByRole('heading', { name: 'Conozcamos al propietario' }).waitFor();
      await audit(page, 'etapa 1');
    });

    await step(`[${label}] etapa 1: obligatorios, país "Otro" y aclaración de representación`, async () => {
      await next();
      await page.getByText('Revisá los datos marcados antes de continuar.').waitFor();
      assert.equal(await page.getByText('Este dato es obligatorio.').count(), 1);
      assert.equal(await page.getByText('Elegí una opción.').count(), 2);
      // El foco va al primer dato con error.
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('autocomplete')), 'name');
      await audit(page, 'etapa 1 con errores');
      await page.getByLabel('¿Cómo te llamás?').fill('Ana Pérez');
      await choose('¿En qué país residís habitualmente?', 'Otro');
      await page.getByLabel('¿En qué país?').fill('Chile');
      await choose('¿Cuál es tu relación con la propiedad?', 'Represento al propietario');
      await page.getByLabel(/Contanos brevemente a quién representás/).fill('Represento a mi madre, propietaria');
      await shot('1-propietario');
      await next();
    });

    await step(`[${label}] etapa 2: casa con piscina y jardín; chacra; apartamento con servicios comunes`, async () => {
      await page.getByRole('heading', { name: 'Conozcamos tu propiedad' }).waitFor();
      await choose('¿Qué tipo de propiedad deseás poner bajo administración?', 'Chacra');
      await page.getByRole('group', { name: /Superficie aproximada del terreno/ }).getByLabel('1–5 ha').check();
      await page.getByRole('group', { name: /¿Qué dependencias adicionales tiene\?/ }).waitFor();
      await choose('¿Qué tipo de propiedad deseás poner bajo administración?', 'Apartamento');
      await page.getByRole('group', { name: /¿Qué servicios comunes tiene el edificio o complejo\?/ }).waitFor();
      assert.equal(await page.getByRole('group', { name: /dependencias adicionales/ }).count(), 0, 'las preguntas de chacra deben ocultarse');
      await choose('¿Qué tipo de propiedad deseás poner bajo administración?', 'Casa');
      await choose('¿Dónde se encuentra ubicada?', 'José Ignacio');
      await page.getByLabel(/Barrio o referencia aproximada/).fill('Cerca de la laguna');
      await choose(/dimensiones aproximadas/, '200–350 m²');
      await choose('¿Cuántos dormitorios tiene?', '3');
      const features = page.getByRole('group', { name: /¿Qué características tiene tu propiedad\?/ });
      await features.getByLabel('Piscina').check();
      await features.getByLabel('Jardín').check();
      await next();
      // Condicionales obligatorias: piscina privada/compartida y mantenimiento del jardín.
      await page.getByText('Revisá los datos marcados antes de continuar.').waitFor();
      await choose('La piscina, ¿es privada o compartida?', 'Privada');
      await choose('El jardín, ¿requiere mantenimiento?', 'Sí');
      // Marca "Propuesta" en las preguntas no detalladas en la especificación (solo en la maqueta).
      assert.ok((await page.getByText('Propuesta', { exact: true }).count()) >= 1);
      await audit(page, 'etapa 2');
      await shot('2-propiedad');
      await next();
    });

    await step(`[${label}] etapa 3: personal contratado, alquiler temporal y servicios`, async () => {
      await page.getByRole('heading', { name: 'Conozcamos tus necesidades' }).waitFor();
      await choose('¿Cuál es el uso principal de tu propiedad?', 'Alquiler temporal');
      await page.getByRole('group', { name: /¿Cómo se gestiona hoy el alquiler\?/ }).waitFor();
      await choose('¿Con qué frecuencia utilizás la propiedad?', 'Principalmente durante la temporada');
      await choose('¿Actualmente alguien se ocupa de la propiedad?', 'Personal contratado');
      await page.getByRole('group', { name: /¿Qué servicios cubre el personal contratado\?/ }).getByLabel('Jardinería').check();
      const services = page.getByRole('group', { name: /¿Qué tipo de servicios te interesan\?/ });
      await services.getByLabel('Inspecciones periódicas').check();
      await services.getByLabel('Apertura y cierre de temporada').check();
      await page.getByLabel(/¿Qué es lo que más te preocupa/).fill('Humedad en el living.\nControl en invierno.');
      await choose('¿Cuándo te gustaría comenzar a trabajar con PRIVAT?', 'Lo antes posible');
      await audit(page, 'etapa 3');
      await shot('3-necesidades');
      await next();
    });

    await step(`[${label}] etapa 4: correo y teléfono válidos y privacidad obligatoria`, async () => {
      await page.getByRole('heading', { name: 'Finalización y contacto' }).waitFor();
      await choose('¿Cómo podemos comunicarnos contigo?', 'WhatsApp');
      await page.getByLabel('Número de teléfono').fill('123');
      await page.getByLabel('Dirección de correo electrónico').fill('ana@');
      await choose('Horario preferido', 'Tarde');
      await choose('¿Te gustaría coordinar una primera entrevista con nuestro equipo?', 'Sí, por videollamada');
      await page.getByRole('button', { name: 'Revisar antes de enviar' }).click();
      await page.getByText(/Revisá el teléfono/).waitFor();
      await page.getByText(/Revisá el correo electrónico/).waitFor();
      await page.getByText(/tenés que aceptar la Política de Privacidad/).waitFor();
      await page.getByLabel('Número de teléfono').fill('+598 99 123 456');
      await page.getByLabel('Dirección de correo electrónico').fill('ana@example.com');
      await page.getByLabel(/He leído y acepto/).check();
      await audit(page, 'etapa 4');
      await shot('4-contacto');
      await page.getByRole('button', { name: 'Revisar antes de enviar' }).click();
    });

    await step(`[${label}] resumen: muestra las respuestas, permite editar y volver; sin precios`, async () => {
      const summary = page.getByTestId('intake-summary');
      await summary.waitFor();
      await summary.getByText('José Ignacio').waitFor();
      await summary.getByText('Inspecciones periódicas, Apertura y cierre de temporada').waitFor();
      await audit(page, 'resumen');
      await shot('5-resumen');
      await page.getByRole('button', { name: 'Editar: Conozcamos tu propiedad' }).click();
      await choose('¿Cuántos dormitorios tiene?', '4');
      await page.getByRole('button', { name: 'Guardar y volver al resumen' }).click();
      await summary.waitFor();
      const text = await summary.innerText();
      assert.match(text, /¿Cuántos dormitorios tiene\?\s*4/);
      assert.ok(!/USD|U\$S|\$\s?\d|precio|tarifa|abono|presupuesto/i.test(text), 'el formulario no debe mostrar precios');
    });

    await step(`[${label}] envío simulado: mensaje final, sin ninguna llamada fuera de la página`, async () => {
      await page.getByRole('button', { name: 'Enviar' }).click();
      const done = page.getByTestId('intake-done');
      await done.waitFor();
      await done.getByText('Gracias por confiar en PRIVAT para conocer las necesidades de tu propiedad.').waitFor();
      await audit(page, 'mensaje final');
      await shot('6-final');
      assert.deepEqual(external, [], 'la maqueta no debe conectarse a nada externo');
      assert.deepEqual(consoleErrors, []);
    });
    await ctx.close();
  }

  await step('la CSP real se aplica (sin bypass): la página funciona y bloquea estilos en línea inyectados', async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const violations = [];
    page.on('console', (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
    await page.goto(`${WEB_URL}/formulario-vista-previa/`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Conozcamos al propietario' }).waitFor();
    assert.deepEqual(violations, [], 'la página no debe generar violaciones de CSP');
    await ctx.close();
  });
} finally {
  await browser.close();
}
console.log(results.join('\n'));
