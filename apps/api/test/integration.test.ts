import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, SignJWT } from 'jose';
import { computeFee, computeTravel } from '@ats/pricing';
import { TEST_ADMIN_ID, TEST_DATABASE_URL, createApp, createKeys, insertAdmin, resetData, signToken
} from './helpers.ts';

/**
 * Pruebas de integración contra PostgreSQL real con las migraciones aplicadas.
 * Requieren TEST_DATABASE_URL; si no está definida se omiten (ver docs/guia-tecnica.md).
 */
const skip = !TEST_DATABASE_URL ? 'TEST_DATABASE_URL no definida' : false;

// Perfil "Casa San Rafael" de la planilla (solo como dato de prueba).
const SAN_RAFAEL = {
  propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3,
  visitsPerMonth: '4', hoursPerVisit: '2', travelHours: '1', adminHours: '5', coordHours: '4', staffHours: '2',
  hourlyRate: '35', fixedCosts: '90', premiumPct: '0.2', highCoef: '2', highMonths: '2.5',
};
const PUNTA_DEL_ESTE = { lat: -34.9606, lng: -54.9489 };
const JOSE_IGNACIO = { lat: -34.8436, lng: -54.6331 };
const TRAVEL = {
  baseLabel: 'Base de prueba', baseLat: PUNTA_DEL_ESTE.lat, baseLng: PUNTA_DEL_ESTE.lng,
  freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' as const,
};

describe('API – integración', { skip }, () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;
  let keys: Awaited<ReturnType<typeof createKeys>>;
  const adminId = TEST_ADMIN_ID;

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${ctx.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  async function publish(): Promise<void> {
    await ctx.prisma.publication.create({
      data: {
        publishedById: adminId,
        snapshot: { pricing: { travel: TRAVEL, profiles: [SAN_RAFAEL], params: { TERRITORY_TOLERANCE_KM: '2' } } },
      },
    });
  }

  before(async () => {
    keys = await createKeys();
    ctx = await createApp(keys.verifier);
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
  });

  describe('health y cabeceras', () => {
    it('GET /health responde ok con cabeceras de seguridad', async () => {
      const res = await fetch(`${ctx.baseUrl}/health`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { status: 'ok' });
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(res.headers.get('strict-transport-security'));
      assert.equal(res.headers.get('x-powered-by'), null);
    });

    it('CORS: solo el origen permitido recibe Access-Control-Allow-Origin', async () => {
      const ok = await fetch(`${ctx.baseUrl}/health`, { headers: { origin: 'http://localhost:5173' } });
      assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      const bad = await fetch(`${ctx.baseUrl}/health`, { headers: { origin: 'https://evil.example' } });
      assert.equal(bad.headers.get('access-control-allow-origin'), null);
    });
  });

  describe('POST /public/simulations', () => {
    it('503 si no hay publicación (no inventa precios)', async () => {
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE });
      assert.equal(res.status, 503);
    });

    it('calcula con la publicación vigente: sin distancia = fórmula sin viático', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE });
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, string>;
      // (23 h × 35 + 0 + 90) × 1,2 = 1074 ; alta × 2 ; anual = 1074 × 9,5 + 2148 × 2,5
      assert.equal(body.lowFee, '1074.00');
      assert.equal(body.highFee, '2148.00');
      assert.equal(body.annualFee, '15573.00');
      assert.equal(body.billableKm, '0.00');
      assert.equal(body.currency, 'USD');
    });

    it('incluye el viático según la distancia', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...JOSE_IGNACIO });
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, string>;
      const travel = computeTravel({ base: PUNTA_DEL_ESTE, freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' }, JOSE_IGNACIO);
      const fee = computeFee({ profile: SAN_RAFAEL, billableKm: travel.billableKm, costPerKm: '0.35' });
      assert.equal(body.billableKm, travel.billableKm);
      assert.equal(body.lowFee, fee.lowFee);
      assert.ok(Number(body.billableKm) > 0);
    });

    it('nunca expone valor hora, prima ni el perfil', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE });
      const text = await res.text();
      for (const secret of ['hourlyRate', 'premiumPct', 'fixedCosts', 'visitsPerMonth', 'highCoef']) {
        assert.ok(!text.includes(secret), `la respuesta no debe incluir ${secret}`);
      }
    });

    it('guarda la simulación reproducible con la IP como HMAC', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE });
      const { simulationId } = (await res.json()) as { simulationId: string };
      const sim = await ctx.prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
      assert.match(sim.ipHash, /^[0-9a-f]{64}$/);
      assert.ok(!sim.ipHash.includes('127.0.0.1'));
      const snap = sim.inputsSnapshot as Record<string, unknown>;
      assert.ok(snap.publicationId && snap.profile && snap.travelConfig && snap.fee);
    });

    it('422 fuera de Uruguay (Buenos Aires)', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, lat: -34.6037, lng: -58.3816 });
      assert.equal(res.status, 422);
    });

    it('404 si no hay tarifa publicada para la combinación', async () => {
      await publish();
      const res = await post('/public/simulations', { propertyTypeCode: 'APTO_TORRE', serviceLevel: 1, ...PUNTA_DEL_ESTE });
      assert.equal(res.status, 404);
    });

    it('400 ante campos extra o valores inválidos', async () => {
      const extra = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE, hourlyRate: 1 });
      assert.equal(extra.status, 400);
      const badLat = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, lat: 120, lng: 0 });
      assert.equal(badLat.status, 400);
      const badCode = await post('/public/simulations', { propertyTypeCode: "x'; drop table lead;--", serviceLevel: 3, ...PUNTA_DEL_ESTE });
      assert.equal(badCode.status, 400);
    });

    it('413 si el cuerpo supera 20 KB', async () => {
      const res = await post('/public/simulations', { propertyTypeCode: 'CASA_PREMIUM', pad: 'x'.repeat(25_000) });
      assert.equal(res.status, 413);
    });
  });

  describe('GET /admin/me (autenticación del panel)', () => {
    const get = (token?: string) =>
      fetch(`${ctx.baseUrl}/admin/me`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

    it('401 sin token', async () => assert.equal((await get()).status, 401));

    it('401 con token firmado por otra clave', async () => {
      const other = await generateKeyPair('ES256');
      assert.equal((await get(await signToken(other.privateKey, { sub: adminId }))).status, 401);
    });

    it('401 con algoritmo simétrico HS256 (confusión de algoritmo)', async () => {
      const hs = await new SignJWT({ aal: 'aal2' })
        .setProtectedHeader({ alg: 'HS256', kid: 'test-key' })
        .setSubject(adminId).setIssuer('https://test-project.supabase.co/auth/v1').setAudience('authenticated')
        .setExpirationTime('5m').sign(new TextEncoder().encode('x'.repeat(32)));
      assert.equal((await get(hs)).status, 401);
    });

    it('401 con token vencido, emisor o audiencia incorrectos', async () => {
      const past = Math.floor(Date.now() / 1000) - 60;
      assert.equal((await get(await signToken(keys.privateKey, { sub: adminId }, { expiresIn: past }))).status, 401);
      assert.equal((await get(await signToken(keys.privateKey, { sub: adminId }, { issuer: 'https://otro.supabase.co/auth/v1' }))).status, 401);
      assert.equal((await get(await signToken(keys.privateKey, { sub: adminId }, { audience: 'anon' }))).status, 401);
    });

    it('403 sin segundo factor (aal1)', async () => {
      assert.equal((await get(await signToken(keys.privateKey, { sub: adminId, aal: 'aal1' }))).status, 403);
    });

    it('403 si el usuario no tiene perfil de administrador', async () => {
      assert.equal((await get(await signToken(keys.privateKey, { sub: randomUUID() }))).status, 403);
    });

    it('403 si el administrador está desactivado (acceso revocado)', async () => {
      await ctx.prisma.adminProfile.update({ where: { id: adminId }, data: { disabledAt: new Date() } });
      assert.equal((await get(await signToken(keys.privateKey, { sub: adminId }))).status, 403);
    });

    it('un administrador con historial de auditoría no se puede borrar', async () => {
      await ctx.prisma.auditLog.create({ data: { actorId: adminId, action: 'TEST', entity: 'test', entityId: '1' } });
      await assert.rejects(ctx.prisma.adminProfile.delete({ where: { id: adminId } }));
    });

    it('200 con token válido, 2FA y perfil de administrador', async () => {
      const res = await get(await signToken(keys.privateKey, { sub: adminId }));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { id: adminId, email: 'admin@test.local', role: 'ADMIN' });
    });
  });

  describe('seguridad de la base de datos', () => {
    it('el rol anon (Data API pública) no puede leer ninguna tabla', async () => {
      const tables = await ctx.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
      assert.ok(tables.length >= 18);
      for (const { tablename } of tables) {
        const priv = await ctx.prisma.$queryRaw<Array<{ can: boolean }>>`
          SELECT has_table_privilege('anon', format('public.%I', ${tablename}::text), 'SELECT,INSERT,UPDATE,DELETE') AS can`;
        assert.equal(priv[0]?.can, false, `anon tiene permisos sobre ${tablename}`);
        const rls = await ctx.prisma.$queryRaw<Array<{ on: boolean }>>`
          SELECT relrowsecurity AS on FROM pg_class WHERE oid = format('public.%I', ${tablename}::text)::regclass`;
        assert.equal(rls[0]?.on, true, `RLS desactivada en ${tablename}`);
      }
    });

    it('audit_log rechaza UPDATE y DELETE', async () => {
      await ctx.prisma.auditLog.create({ data: { action: 'test', entity: 'test', entityId: '1' } });
      await assert.rejects(ctx.prisma.auditLog.updateMany({ data: { action: 'x' } }));
      await assert.rejects(ctx.prisma.auditLog.deleteMany({}));
    });
  });
});

describe('Límite de peticiones', { skip }, () => {
  it('429 al superar 10 simulaciones por minuto', async () => {
    const keys = await createKeys();
    const ctx = await createApp(keys.verifier);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        const res = await fetch(`${ctx.baseUrl}/public/simulations`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ propertyTypeCode: 'CASA_PREMIUM', serviceLevel: 3, ...PUNTA_DEL_ESTE }),
        });
        statuses.push(res.status);
      }
      assert.equal(statuses.at(-1), 429);
      assert.ok(statuses.slice(0, 10).every((s) => s !== 429));
    } finally {
      await ctx.app.close();
    }
  });
});
