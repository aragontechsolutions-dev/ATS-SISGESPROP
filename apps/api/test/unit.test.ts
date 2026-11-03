import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/app-config.ts';
import { hashIp } from '../src/common/ip-hash.ts';
import { parsePricingSnapshot } from '../src/simulation/pricing-snapshot.ts';
import { isWithinTerritory } from '@ats/pricing';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../src/geo/uruguay.ts';

const baseEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://x',
  SUPABASE_URL: 'https://p.supabase.co',
  CORS_ORIGINS: 'https://www.cliente.com.uy',
  IP_HASH_SECRET: 'x'.repeat(32),
};

describe('loadConfig', () => {
  it('acepta una configuración válida', () => {
    const c = loadConfig(baseEnv);
    assert.deepEqual(c.corsOrigins, ['https://www.cliente.com.uy']);
    assert.equal(c.trustProxyHops, 1);
  });
  it('exige variables obligatorias', () => {
    assert.throws(() => loadConfig({ ...baseEnv, DATABASE_URL: '' }), /DATABASE_URL/);
  });
  it('exige https en producción', () => {
    assert.throws(() => loadConfig({ ...baseEnv, SUPABASE_URL: 'http://p.supabase.co' }), /https/);
    assert.throws(() => loadConfig({ ...baseEnv, CORS_ORIGINS: 'http://www.cliente.com.uy' }), /https/);
  });
  it('rechaza orígenes CORS con ruta o barra final', () => {
    assert.throws(() => loadConfig({ ...baseEnv, CORS_ORIGINS: 'https://www.cliente.com.uy/' }), /origen exacto/);
  });
  it('exige un secreto de hash de IP largo', () => {
    assert.throws(() => loadConfig({ ...baseEnv, IP_HASH_SECRET: 'corto' }), /32/);
  });
});

describe('hashIp', () => {
  it('no guarda la IP en claro y depende del secreto', () => {
    const a = hashIp('190.64.1.1', 's1'.repeat(16));
    const b = hashIp('190.64.1.1', 's2'.repeat(16));
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.ok(!a.includes('190.64'));
    assert.notEqual(a, b);
  });
});

describe('parsePricingSnapshot', () => {
  const valid = {
    pricing: {
      travel: { baseLabel: 'Base', baseLat: -34.9, baseLng: -54.95, freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' },
      profiles: [],
      params: { TERRITORY_TOLERANCE_KM: '2' },
    },
  };
  it('acepta un snapshot válido', () => assert.ok(parsePricingSnapshot(valid)));
  it('devuelve null sin sección pricing', () => assert.equal(parsePricingSnapshot({}), null));
  it('rechaza decimales con formato inválido', () => {
    const bad = structuredClone(valid);
    bad.pricing.travel.costPerKm = '-1';
    assert.equal(parsePricingSnapshot(bad), null);
  });
});

describe('contorno de Uruguay (datos reales)', () => {
  const tol = DEFAULT_TERRITORY_TOLERANCE_KM;
  const inside: Record<string, [number, number]> = {
    'Punta del Este': [-34.9606, -54.9489],
    'José Ignacio': [-34.8436, -54.6331],
    'La Paloma': [-34.6617, -54.1625],
    'Cabo Polonio (costa, requiere tolerancia)': [-34.4031, -53.7836],
    'Punta Ballena (costa, requiere tolerancia)': [-34.9097, -55.0447],
    Montevideo: [-34.9068, -56.2115],
    Rivera: [-30.9053, -55.5508],
  };
  const outside: Record<string, [number, number]> = {
    'Buenos Aires': [-34.6037, -58.3816],
    'Concordia (AR)': [-31.3929, -58.0209],
    'Porto Alegre (BR)': [-30.03, -51.23],
    'Mar frente a Punta del Este': [-35.2, -54.9],
  };
  for (const [name, [lat, lng]] of Object.entries(inside)) {
    it(`acepta ${name}`, () => assert.equal(isWithinTerritory({ lat, lng }, URUGUAY_GEOMETRY, tol), true));
  }
  for (const [name, [lat, lng]] of Object.entries(outside)) {
    it(`rechaza ${name}`, () => assert.equal(isWithinTerritory({ lat, lng }, URUGUAY_GEOMETRY, tol), false));
  }
});
