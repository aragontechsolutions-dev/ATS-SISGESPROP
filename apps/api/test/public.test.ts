import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { computeTravel } from '@ats/pricing';
import {
  TEST_DATABASE_URL,
  createApp,
  createKeys,
  insertAdmin,
  recordingNotifier,
  resetData,
  testConfig,
  TEST_ADMIN_ID,
} from './helpers.ts';

/** IP distinta por petición (detrás de un proxy) para no chocar con los límites por IP. */
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter++ % 250) + 1}`;

/** Cobertura, estimación de viático y formulario de consultas (Bloque C). Requiere TEST_DATABASE_URL. */
const skip = !TEST_DATABASE_URL ? 'TEST_DATABASE_URL no definida' : false;

const BASE = { lat: -34.9606, lng: -54.9489 }; // Punta del Este (dato de prueba)
const JOSE_IGNACIO = { lat: -34.8436, lng: -54.6331 };
const PROFILE = {
  propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3,
  visitsPerMonth: '4', hoursPerVisit: '2', travelHours: '1', adminHours: '5', coordHours: '4', staffHours: '2',
  hourlyRate: '35', fixedCosts: '90', premiumPct: '0.2', highCoef: '2', highMonths: '2.5',
};
const TRAVEL = {
  baseLabel: 'Base de prueba', baseLat: BASE.lat, baseLng: BASE.lng,
  freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' as const,
};

const validLead = {
  name: 'Ana Pérez',
  email: 'Ana@Example.com',
  phone: '+598 99 123 456',
  propertyTypeCode: 'CASA_PREMIUM',
  message: 'Casa cerrada en invierno.',
  consent: true,
  policyVersion: 'provisoria-0',
  turnstileToken: 'ok',
};

describe('Endpoints públicos – cobertura y consultas', { skip }, () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;
  const notifier = recordingNotifier();
  const adminId = TEST_ADMIN_ID;

  const post = (path: string, body: unknown) =>
    fetch(`${ctx.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
      body: JSON.stringify(body),
    });

  const publish = () =>
    ctx.prisma.publication.create({
      data: { publishedById: adminId, snapshot: { pricing: { travel: TRAVEL, profiles: [PROFILE], params: { TERRITORY_TOLERANCE_KM: '2' } } } },
    });

  before(async () => {
    const keys = await createKeys();
    ctx = await createApp(keys.verifier, testConfig({ trustProxyHops: 1 }), notifier);
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
    notifier.notices.length = 0;
  });

  describe('GET /public/coverage', () => {
    it('503 sin publicación', async () => {
      assert.equal((await fetch(`${ctx.baseUrl}/public/coverage`)).status, 503);
    });
    it('devuelve solo la base de operaciones publicada', async () => {
      await publish();
      const res = await fetch(`${ctx.baseUrl}/public/coverage`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { baseLabel: 'Base de prueba', baseLat: BASE.lat, baseLng: BASE.lng });
    });
  });

  describe('POST /public/travel-estimate', () => {
    it('distancia y viático por visita = km facturables × costo por km', async () => {
      await publish();
      const res = await post('/public/travel-estimate', JOSE_IGNACIO);
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, string>;
      const expected = computeTravel({ base: BASE, freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' }, JOSE_IGNACIO);
      assert.equal(body.distanceKm, expected.routeKm);
      assert.equal(body.billableKm, expected.billableKm);
      assert.equal(body.travelCostPerVisit, (Math.round(Number(expected.billableKm) * 0.35 * 100) / 100).toFixed(2));
    });
    it('422 fuera de Uruguay y 400 con datos inválidos', async () => {
      await publish();
      assert.equal((await post('/public/travel-estimate', { lat: -34.6037, lng: -58.3816 })).status, 422);
      assert.equal((await post('/public/travel-estimate', { lat: 'x', lng: 0 })).status, 400);
      assert.equal((await post('/public/travel-estimate', { ...JOSE_IGNACIO, extra: 1 })).status, 400);
    });
  });

  describe('POST /public/leads', () => {
    it('guarda la consulta y el consentimiento, y avisa al equipo', async () => {
      const res = await post('/public/leads', validLead);
      assert.equal(res.status, 201);
      assert.deepEqual(await res.json(), { ok: true });
      const lead = await ctx.prisma.lead.findFirstOrThrow({ include: { consent: true, propertyType: true } });
      assert.equal(lead.email, 'ana@example.com');
      assert.equal(lead.status, 'NUEVA');
      assert.equal(lead.propertyType?.code, 'CASA_PREMIUM');
      assert.equal(lead.consent?.policyVersion, 'provisoria-0');
      assert.match(lead.consent?.ipHash ?? '', /^[0-9a-f]{64}$/);
      assert.equal(notifier.notices.length, 1);
      assert.equal(notifier.notices[0]?.leadId, lead.id);
    });

    it('guarda país de residencia y ubicación del inmueble (opcionales) y los valida', async () => {
      const res = await post('/public/leads', { ...validLead, residenceCountry: ' Argentina ', propertyLocation: 'José Ignacio' });
      assert.equal(res.status, 201);
      const lead = await ctx.prisma.lead.findFirstOrThrow();
      assert.equal(lead.residenceCountry, 'Argentina');
      assert.equal(lead.propertyLocation, 'José Ignacio');
      assert.equal((await post('/public/leads', { ...validLead, residenceCountry: 'A'.repeat(61) })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, propertyLocation: 'Punta\u0000Ballena' })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, propertyLocation: '<script>' })).status, 400);
    });

    it('403 y nada guardado si el anti-spam falla', async () => {
      const res = await post('/public/leads', { ...validLead, turnstileToken: 'bot' });
      assert.equal(res.status, 403);
      assert.equal(await ctx.prisma.lead.count(), 0);
      assert.equal(notifier.notices.length, 0);
    });

    it('400 sin consentimiento, con email inválido o campos extra', async () => {
      assert.equal((await post('/public/leads', { ...validLead, consent: false })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, consent: 'true' })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, email: 'no-es-email' })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, status: 'CERRADA' })).status, 400);
      assert.equal((await post('/public/leads', { ...validLead, message: 'x'.repeat(2001) })).status, 400);
      assert.equal(await ctx.prisma.lead.count(), 0);
    });

    it('400 con tipo de propiedad inexistente', async () => {
      assert.equal((await post('/public/leads', { ...validLead, propertyTypeCode: 'NO_EXISTE' })).status, 400);
    });

    it('adjunta la simulación una sola vez', async () => {
      await publish();
      const simRes = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...BASE });
      const { simulationId } = (await simRes.json()) as { simulationId: string };

      assert.equal((await post('/public/leads', { ...validLead, simulationId })).status, 201);
      assert.equal((await post('/public/leads', { ...validLead, simulationId })).status, 201);
      const leads = await ctx.prisma.lead.findMany({ orderBy: { createdAt: 'asc' } });
      assert.equal(leads.length, 2);
      assert.equal(leads[0]?.simulationId, simulationId);
      assert.equal(leads[1]?.simulationId, null);
    });

    it('ignora un id de simulación inexistente', async () => {
      assert.equal((await post('/public/leads', { ...validLead, simulationId: randomUUID() })).status, 201);
      const lead = await ctx.prisma.lead.findFirstOrThrow();
      assert.equal(lead.simulationId, null);
    });
  });
});

describe('Límite de envíos del formulario', { skip }, () => {
  it('429 al superar 5 consultas por minuto', async () => {
    const keys = await createKeys();
    const ctx = await createApp(keys.verifier);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${ctx.baseUrl}/public/leads`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...validLead, turnstileToken: 'bot' }),
        });
        statuses.push(res.status);
      }
      assert.equal(statuses.at(-1), 429);
      assert.ok(statuses.slice(0, 5).every((s) => s === 403));
    } finally {
      await ctx.app.close();
    }
  });
});
