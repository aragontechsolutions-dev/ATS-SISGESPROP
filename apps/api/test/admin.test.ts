import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  TEST_DATABASE_URL,
  createApp,
  createKeys,
  insertAdmin,
  recordingDeploy,
  resetData,
  seedContentSections,
  signToken,
  testConfig,
  TEST_ADMIN_ID,
} from './helpers.ts';

/** API del panel (Bloque D). Requiere TEST_DATABASE_URL. */
const skip = !TEST_DATABASE_URL ? 'TEST_DATABASE_URL no definida' : false;

let ipCounter = 0;
const nextIp = () => `198.51.100.${(ipCounter++ % 250) + 1}`;

const SAN_RAFAEL = {
  visitsPerMonth: '4', hoursPerVisit: '2', travelHours: '1', adminHours: '5', coordHours: '4', staffHours: '2',
  hourlyRate: '35', fixedCosts: '90', premiumPct: '0.2', highCoef: '2', highMonths: '2.5',
};
const PUNTA_DEL_ESTE = { lat: -34.9606, lng: -54.9489 };
const TRAVEL = { baseLabel: 'Base de prueba', baseLat: PUNTA_DEL_ESTE.lat, baseLng: PUNTA_DEL_ESTE.lng, freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' };

describe('API del panel', { skip }, () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;
  let keys: Awaited<ReturnType<typeof createKeys>>;
  const deploy = recordingDeploy('disparado');
  const adminId = TEST_ADMIN_ID;
  let token = '';

  async function call(method: string, path: string, body?: unknown, auth: string | null = token) {
    const headers: Record<string, string> = { 'x-forwarded-for': nextIp() };
    if (auth) headers.authorization = `Bearer ${auth}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    return fetch(`${ctx.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  const json = async (res: Response) => (await res.json()) as Record<string, any>;

  async function fillAllSections() {
    for (const [section, value] of Object.entries(seedContentSections())) {
      const res = await call('PUT', `/admin/content/sections/${section}`, { value });
      assert.equal(res.status, 200, `sección ${section}: ${await res.text()}`);
    }
  }

  before(async () => {
    keys = await createKeys();
    ctx = await createApp(keys.verifier, testConfig({ trustProxyHops: 1 }), undefined, deploy);
  });
  after(async () => {
    try {
      await resetData(ctx.prisma);
    } finally {
      await ctx.app.close();
    }
  });
  beforeEach(async () => {
    await resetData(ctx.prisma);
    await insertAdmin(ctx.prisma, adminId);
    token = await signToken(keys.privateKey, { sub: adminId });
    deploy.calls = 0;
  });

  describe('acceso', () => {
    const routes: Array<[string, string]> = [
      ['GET', '/admin/content'],
      ['PUT', '/admin/content/sections/hero'],
      ['GET', '/admin/pricing'],
      ['PUT', '/admin/pricing/travel'],
      ['POST', '/admin/publications'],
      ['GET', '/admin/leads'],
      ['GET', '/admin/leads/export.csv'],
      ['GET', '/admin/audit'],
    ];
    it('todas las rutas del panel exigen sesión (401)', async () => {
      for (const [m, p] of routes) assert.equal((await call(m, p, m === 'GET' ? undefined : {}, null)).status, 401, `${m} ${p}`);
    });
    it('y segundo factor (403 con aal1)', async () => {
      const aal1 = await signToken(keys.privateKey, { sub: adminId, aal: 'aal1' });
      for (const [m, p] of routes) assert.equal((await call(m, p, m === 'GET' ? undefined : {}, aal1)).status, 403, `${m} ${p}`);
    });
  });

  describe('contenidos', () => {
    it('guarda una sección válida y la audita con antes/después', async () => {
      const value = {
        title: 'Nuevo titular',
        subtitle: 'Subtítulo',
        complement: 'Texto complementario',
        cta: 'Contactar',
        secondaryCta: 'Calcular mi abono',
        slogan: null,
        badges: ['Uno'],
        image: 'casa-frente-mar',
      };
      const res = await call('PUT', '/admin/content/sections/hero', { value });
      assert.equal(res.status, 200);
      const log = await ctx.prisma.auditLog.findFirstOrThrow({ where: { entity: 'content_block', entityId: 'hero' }, orderBy: { id: 'desc' } });
      assert.equal(log.actorId, adminId);
      assert.equal(log.action, 'UPDATE');
      assert.deepEqual(log.afterData, value);
    });

    it('solo acepta imágenes de la lista cerrada (nunca una URL)', async () => {
      const base = { title: 'T', subtitle: 'S', complement: 'C', cta: 'A', secondaryCta: 'B', slogan: null, badges: [] };
      assert.equal((await call('PUT', '/admin/content/sections/hero', { value: { ...base, image: 'https://evil.example/x.png' } })).status, 400);
      assert.equal((await call('PUT', '/admin/content/sections/hero', { value: { ...base, image: '../../etc/passwd' } })).status, 400);
      assert.equal((await call('PUT', '/admin/content/sections/hero', { value: { ...base, image: 'ninguna' } })).status, 200);
    });

    it('rechaza secciones inexistentes, campos extra y datos inválidos', async () => {
      assert.equal((await call('PUT', '/admin/content/sections/hacker', { value: {} })).status, 404);
      const extra = await call('PUT', '/admin/content/sections/brand', { value: { name: 'PRIVAT', script: '<script>' } });
      assert.equal(extra.status, 400);
      assert.match(JSON.stringify(await json(extra)), /campo no permitido/);
      assert.equal((await call('PUT', '/admin/content/sections/brand', { value: { name: '' } })).status, 400);
      assert.equal((await call('PUT', '/admin/content/sections/hero', { value: { title: 'x'.repeat(141), subtitle: 's', cta: 'c', badges: [] } })).status, 400);
    });

    it('bloquea URLs que no sean https (javascript:, http:)', async () => {
      for (const url of ['javascript:alert(1)', 'http://inseguro.uy/p', 'data:text/html,hola']) {
        const res = await call('PUT', '/admin/content/sections/footer', { value: { legal: null, privacyPolicyUrl: url, termsUrl: null } });
        assert.equal(res.status, 400, url);
      }
      const ok = await call('PUT', '/admin/content/sections/footer', { value: { legal: 'PRIVAT', privacyPolicyUrl: 'https://privat.uy/privacidad', termsUrl: '' } });
      assert.equal(ok.status, 200);
      assert.equal((await json(ok)).value.termsUrl, null);
    });

    it('el menú solo admite anclas de la landing', async () => {
      const bad = await call('PUT', '/admin/content/sections/nav', { value: { items: [{ label: 'X', href: 'https://evil.example' }] } });
      assert.equal(bad.status, 400);
    });

    it('quita caracteres de control', async () => {
      const res = await call('PUT', '/admin/content/sections/brand', { value: { name: 'PRI\u0000VAT\u0007' } });
      assert.equal((await json(res)).value.name, 'PRIVAT');
    });

    it('preguntas frecuentes: alta, edición, baja y auditoría', async () => {
      const created = await json(await call('POST', '/admin/content/faq', { category: 'Cobertura', question: '¿Trabajan en Rocha?', answer: 'Sí, en todo Uruguay.', sortOrder: 1, visible: true }));
      assert.equal(created.category, 'Cobertura');
      assert.ok(created.id);
      assert.equal((await call('PUT', `/admin/content/faq/${created.id}`, { category: 'Cobertura', question: '¿Y en Colonia?', answer: 'También.', sortOrder: 2, visible: false })).status, 200);
      assert.equal((await call('DELETE', `/admin/content/faq/${created.id}`)).status, 204);
      const actions = (await ctx.prisma.auditLog.findMany({ where: { entity: 'faq', entityId: created.id }, orderBy: { id: 'asc' } })).map((a) => a.action);
      assert.deepEqual(actions, ['CREATE', 'UPDATE', 'DELETE']);
      assert.equal((await call('POST', '/admin/content/faq', { category: 'General', question: 'x', answer: 'y', sortOrder: 1, visible: true })).status, 400);
      // La categoría es obligatoria y sin caracteres de control.
      assert.equal((await call('POST', '/admin/content/faq', { question: '¿Pregunta válida?', answer: 'Respuesta válida.', sortOrder: 1, visible: true })).status, 400);
      assert.equal((await call('POST', '/admin/content/faq', { category: 'Mal\u0007', question: '¿Pregunta válida?', answer: 'Respuesta válida.', sortOrder: 1, visible: true })).status, 400);
    });

    it('testimonios: exige fecha de autorización no futura', async () => {
      const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      assert.equal((await call('POST', '/admin/content/testimonials', { author: 'Ana', text: 'Excelente servicio.', authorizedAt: future, visible: true })).status, 400);
      assert.equal((await call('POST', '/admin/content/testimonials', { author: 'Ana', text: 'Excelente servicio.', authorizedAt: '2026-10-01', visible: true })).status, 201);
    });

    it('niveles de servicio: edita y rechaza niveles inexistentes', async () => {
      assert.equal((await call('PUT', '/admin/content/service-levels/2', { name: 'Administración', description: 'Operativa y finanzas', items: ['Pagos'] })).status, 200);
      assert.equal((await call('PUT', '/admin/content/service-levels/9', { name: 'Nivel nueve', description: 'No existe', items: [] })).status, 404);
    });
  });

  describe('precios y viáticos', () => {
    it('guarda un perfil validado con el motor real', async () => {
      assert.equal((await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', SAN_RAFAEL)).status, 200);
      assert.equal((await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', { ...SAN_RAFAEL, highMonths: '13' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', { ...SAN_RAFAEL, hourlyRate: '-5' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', { ...SAN_RAFAEL, hourlyRate: '1e3' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/profiles/NO_EXISTE/3', SAN_RAFAEL)).status, 404);
      const data = await json(await call('GET', '/admin/pricing'));
      assert.equal(data.configuredProfiles, 1);
      assert.equal(data.totalProfiles, 15);
      assert.equal(data.profiles[0].hourlyRate, '35');
    });

    it('la base de operaciones debe estar en Uruguay; tramos bloqueados (P-3)', async () => {
      assert.equal((await call('PUT', '/admin/pricing/travel', { ...TRAVEL, baseLat: -34.6037, baseLng: -58.3816 })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/travel', { ...TRAVEL, mode: 'POR_TRAMOS' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/travel', { ...TRAVEL, routeFactor: '0.8' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/travel', TRAVEL)).status, 200);
    });

    it('parámetros: lista cerrada y rangos', async () => {
      assert.equal((await call('PUT', '/admin/pricing/params/OTRO', { value: '1' })).status, 404);
      assert.equal((await call('PUT', '/admin/pricing/params/TERRITORY_TOLERANCE_KM', { value: '50' })).status, 400);
      assert.equal((await call('PUT', '/admin/pricing/params/TERRITORY_TOLERANCE_KM', { value: '3' })).status, 200);
    });

    it('simulación de prueba: usa el borrador, no se guarda y no llega al público', async () => {
      assert.equal((await call('POST', '/admin/pricing/test-simulation', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE })).status, 503);
      await call('PUT', '/admin/pricing/travel', TRAVEL);
      await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', SAN_RAFAEL);
      const res = await call('POST', '/admin/pricing/test-simulation', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE });
      assert.equal(res.status, 200);
      const body = await json(res);
      assert.equal(body.lowFee, '1074.00');
      assert.equal(body.totalHours, '23');
      assert.equal(await ctx.prisma.simulation.count(), 0);
      // El borrador no llega al cotizador público.
      assert.equal((await call('POST', '/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE }, null)).status, 503);
    });
  });

  describe('publicar y restaurar', () => {
    it('no publica con secciones faltantes', async () => {
      const res = await call('POST', '/admin/publications');
      assert.equal(res.status, 422);
      assert.ok((await json(res)).missing.includes('hero'));
      assert.equal(deploy.calls, 0);
    });

    it('publica contenido sin precios (cotizador sigue "no configurado")', async () => {
      await fillAllSections();
      const res = await call('POST', '/admin/publications');
      assert.equal(res.status, 201);
      const body = await json(res);
      assert.equal(body.deploy, 'disparado');
      assert.equal(deploy.calls, 1);
      assert.ok(body.warnings.some((w: string) => /base de operaciones/.test(w)));
      const content = await json(await call('GET', '/public/content', undefined, null));
      assert.equal(content.content.sections.brand.name, 'PRIVAT');
      assert.equal(content.content.services.length, 3);
      assert.ok(!JSON.stringify(content).includes('hourlyRate'));
      assert.equal((await call('POST', '/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE }, null)).status, 503);
    });

    it('publica precios y restaura una versión anterior', async () => {
      await fillAllSections();
      await call('PUT', '/admin/pricing/travel', TRAVEL);
      await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', SAN_RAFAEL);
      const v1 = await json(await call('POST', '/admin/publications'));

      const quote = async () =>
        json(await call('POST', '/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE }, null));
      assert.equal((await quote()).lowFee, '1074.00');

      // Cambio en borrador: no afecta al público hasta publicar.
      await call('PUT', '/admin/pricing/profiles/CASA_PREMIUM/3', { ...SAN_RAFAEL, hourlyRate: '40' });
      assert.equal((await quote()).lowFee, '1074.00');
      await call('POST', '/admin/publications');
      assert.equal((await quote()).lowFee, '1212.00'); // (23 × 40 + 90) × 1,2

      const restored = await call('POST', `/admin/publications/${v1.id}/restore`);
      assert.equal(restored.status, 201);
      assert.equal((await quote()).lowFee, '1074.00');

      const list = await json(await call('GET', '/admin/publications'));
      assert.equal((list as unknown as unknown[]).length, 3);
      assert.equal((await call('POST', `/admin/publications/${randomUUID()}/restore`)).status, 404);
    });
  });

  describe('consultas', () => {
    async function lead(name: string, message: string | null = null) {
      return ctx.prisma.lead.create({ data: { name, email: 'a@b.uy', message } });
    }

    it('lista, filtra y cambia el estado con auditoría', async () => {
      const l = await lead('Ana');
      await lead('Beto');
      const list = await json(await call('GET', '/admin/leads'));
      assert.equal(list.total, 2);
      assert.equal((await call('PATCH', `/admin/leads/${l.id}/status`, { status: 'CONTACTADA' })).status, 200);
      assert.equal((await call('PATCH', `/admin/leads/${l.id}/status`, { status: 'BORRADA' })).status, 400);
      assert.equal((await json(await call('GET', '/admin/leads?status=CONTACTADA'))).total, 1);
      const log = await ctx.prisma.auditLog.findFirstOrThrow({ where: { entity: 'lead', entityId: l.id, action: 'UPDATE_STATUS' } });
      assert.deepEqual(log.beforeData, { status: 'NUEVA' });
    });

    it('CSV: neutraliza fórmulas, incluye BOM y queda auditado', async () => {
      await lead('=HYPERLINK("http://evil.example","clic")', '+SUM(1,2) "comillas"');
      // audit_log es inmutable y acumula corridas anteriores: se mide la diferencia.
      const exportsBefore = await ctx.prisma.auditLog.count({ where: { action: 'EXPORT_CSV' } });
      const res = await call('GET', '/admin/leads/export.csv');
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/csv/);
      assert.match(res.headers.get('content-disposition') ?? '', /attachment/);
      // fetch().text() descarta el BOM al decodificar: se verifican los bytes crudos.
      const bytes = new Uint8Array(await res.arrayBuffer());
      assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
      assert.ok(text.startsWith('\uFEFF"Fecha"'));
      assert.ok(text.includes(`"'=HYPERLINK(""http://evil.example"",""clic"")"`));
      assert.ok(text.includes(`"'+SUM(1,2) ""comillas"""`));
      assert.equal(await ctx.prisma.auditLog.count({ where: { action: 'EXPORT_CSV' } }), exportsBefore + 1);
    });

    it('lista y exporta país de residencia y ubicación del inmueble (también neutralizados)', async () => {
      await ctx.prisma.lead.create({
        data: { name: 'Carla', email: 'c@b.uy', residenceCountry: '=cmd|"/c calc"!A1', propertyLocation: 'José Ignacio' },
      });
      const list = await json(await call('GET', '/admin/leads'));
      const item = list.items.find((i: { name: string }) => i.name === 'Carla');
      assert.equal(item.residenceCountry, '=cmd|"/c calc"!A1');
      assert.equal(item.propertyLocation, 'José Ignacio');
      const text = new TextDecoder().decode(await (await call('GET', '/admin/leads/export.csv')).arrayBuffer());
      assert.ok(text.includes('"País de residencia","Ubicación del inmueble"'));
      assert.ok(text.includes(`"'=cmd|""/c calc""!A1","José Ignacio"`));
    });
  });

  it('registro de cambios: lista lo más reciente primero', async () => {
    await call('PUT', '/admin/content/sections/brand', { value: { name: 'PRIVAT' } });
    const res = await json(await call('GET', '/admin/audit'));
    assert.ok(res.total >= 1);
    assert.equal(res.items[0].entity, 'content_block');
    assert.equal(res.items[0].actor, 'admin@test.local');
  });
});
