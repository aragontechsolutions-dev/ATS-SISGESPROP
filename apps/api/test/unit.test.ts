import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRateLimitDisabled, loadConfig } from '../src/config/app-config.ts';
import { hashIp } from '../src/common/ip-hash.ts';
import { parsePricingSnapshot } from '../src/simulation/pricing-snapshot.ts';
import { isWithinTerritory } from '@ats/pricing';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../src/geo/uruguay.ts';
import { TurnstileVerifier } from '../src/leads/turnstile.verifier.ts';
import { ResendLeadNotifier } from '../src/leads/resend-notifier.ts';
import { describeDbError } from '../src/health/health.controller.ts';
import { BRAND, escapeHtml, renderNewLeadEmail } from '../src/leads/lead-email.ts';
import { readFileSync } from 'node:fs';

describe('describeDbError (log del health check)', () => {
  it('muestra el código y el mensaje, nunca la URL de conexión', () => {
    const err = Object.assign(new Error('password authentication failed for user "postgres.abc"'), { code: '28P01' });
    assert.equal(describeDbError(err), '28P01: password authentication failed for user "postgres.abc"');
    const leak = new Error('bad postgresql://u:secreta@h:6543/db');
    assert.ok(!describeDbError(leak).includes('secreta'));
    assert.match(describeDbError({ cause: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND x' } }), /^ENOTFOUND/);
  });
});

const baseEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db.local:6543/postgres',
  SUPABASE_URL: 'https://p.supabase.co',
  CORS_ORIGINS: 'https://www.cliente.com.uy',
  IP_HASH_SECRET: 'x'.repeat(32),
  TURNSTILE_SECRET_KEY: 'secret',
  TURNSTILE_ALLOWED_HOSTNAMES: 'www.cliente.com.uy, cliente.com.uy',
  RESEND_API_KEY: 're_test_key',
  LEAD_NOTIFY_FROM: 'PRIVAT <avisos@privatgp.com>',
  LEAD_NOTIFY_TO: 'equipo@privatgp.com, otra@privatgp.com',
  PANEL_URL: 'https://privatgp.com/admin/',
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
  it('exige la clave secreta de Turnstile y dominios permitidos en producción', () => {
    assert.throws(() => loadConfig({ ...baseEnv, TURNSTILE_SECRET_KEY: '' }), /TURNSTILE_SECRET_KEY/);
    assert.throws(() => loadConfig({ ...baseEnv, TURNSTILE_ALLOWED_HOSTNAMES: '' }), /TURNSTILE_ALLOWED_HOSTNAMES/);
    assert.deepEqual(loadConfig(baseEnv).turnstileAllowedHostnames, ['www.cliente.com.uy', 'cliente.com.uy']);
  });
  it('RATE_LIMIT_DISABLED: prohibido en producción e ineficaz fuera de entornos de prueba', () => {
    assert.throws(() => loadConfig({ ...baseEnv, RATE_LIMIT_DISABLED: 'true' }), /no está permitido en producción/);
    assert.equal(isRateLimitDisabled({ NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' }), false);
    assert.equal(isRateLimitDisabled({ NODE_ENV: 'development', RATE_LIMIT_DISABLED: 'true' }), true);
    assert.equal(isRateLimitDisabled({ NODE_ENV: 'development' }), false);
  });
  it('Resend: obligatorio en producción, completo y con formatos válidos', () => {
    const c = loadConfig(baseEnv);
    assert.deepEqual(c.resend?.to, ['equipo@privatgp.com', 'otra@privatgp.com']);
    const none = { ...baseEnv, RESEND_API_KEY: '', LEAD_NOTIFY_FROM: '', LEAD_NOTIFY_TO: '', PANEL_URL: '' };
    assert.throws(() => loadConfig(none), /aviso por email es obligatorio/);
    assert.equal(loadConfig({ ...none, NODE_ENV: 'development' }).resend, null);
    assert.throws(() => loadConfig({ ...baseEnv, PANEL_URL: '' }), /faltan: PANEL_URL/);
    assert.throws(() => loadConfig({ ...baseEnv, LEAD_NOTIFY_FROM: 'no es un email' }), /LEAD_NOTIFY_FROM/);
    assert.throws(() => loadConfig({ ...baseEnv, LEAD_NOTIFY_TO: 'a@b.uy, malo' }), /LEAD_NOTIFY_TO/);
    assert.throws(() => loadConfig({ ...baseEnv, PANEL_URL: 'http://privatgp.com/admin/' }), /https/);
  });
  it('rechaza valores entre comillas y DATABASE_URL inválida, sin mostrar el valor', () => {
    assert.throws(() => loadConfig({ ...baseEnv, DATABASE_URL: '"postgresql://u:clave@h:6543/db"' }), /DATABASE_URL no debe ir entre comillas/);
    assert.throws(() => loadConfig({ ...baseEnv, TURNSTILE_SECRET_KEY: "'s'" }), /TURNSTILE_SECRET_KEY no debe ir entre comillas/);
    for (const bad of ['https://h/db', 'no-es-url-clave123', 'postgresql:///sin-host']) {
      assert.throws(
        () => loadConfig({ ...baseEnv, DATABASE_URL: bad }),
        (e: Error) => /cadena PostgreSQL válida/.test(e.message) && !e.message.includes(bad),
      );
    }
    assert.equal(loadConfig({ ...baseEnv, DATABASE_URL: 'postgresql://u:p%40ss@h.pooler.supabase.com:6543/postgres' }).databaseUrl.startsWith('postgresql://'), true);
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

describe('TurnstileVerifier (verificación en el servidor)', () => {
  type Call = { url: string; body: FormData };
  function fakeFetch(response: () => Promise<Response>) {
    const calls: Call[] = [];
    const fn = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body as FormData });
      return response();
    }) as unknown as typeof fetch;
    return { fn, calls };
  }
  const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });

  it('envía secret, response y remoteip a siteverify y acepta success=true', async () => {
    const f = fakeFetch(json({ success: true, hostname: 'www.cliente.com.uy' }));
    const v = new TurnstileVerifier('s3cr3t', ['www.cliente.com.uy'], f.fn);
    assert.equal(await v.verify('tok', '1.2.3.4'), true);
    assert.equal(f.calls[0]?.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(f.calls[0]?.body.get('secret'), 's3cr3t');
    assert.equal(f.calls[0]?.body.get('response'), 'tok');
    assert.equal(f.calls[0]?.body.get('remoteip'), '1.2.3.4');
  });
  it('rechaza success=false', async () => {
    const v = new TurnstileVerifier('s', [], fakeFetch(json({ success: false, 'error-codes': ['invalid-input-response'] })).fn);
    assert.equal(await v.verify('tok', undefined), false);
  });
  it('rechaza un token emitido para otro dominio', async () => {
    const v = new TurnstileVerifier('s', ['www.cliente.com.uy'], fakeFetch(json({ success: true, hostname: 'evil.example' })).fn);
    assert.equal(await v.verify('tok', undefined), false);
  });
  it('falla cerrado ante error HTTP o de red', async () => {
    assert.equal(await new TurnstileVerifier('s', [], fakeFetch(json({}, 500)).fn).verify('t', undefined), false);
    const broken = fakeFetch(async () => {
      throw new Error('red caída');
    });
    assert.equal(await new TurnstileVerifier('s', [], broken.fn).verify('t', undefined), false);
  });
});

describe('ResendLeadNotifier (aviso por email)', () => {
  const config = { apiKey: 're_secret', from: 'PRIVAT <avisos@privatgp.com>', to: ['equipo@privatgp.com'], panelUrl: 'https://privatgp.com/admin/' };
  function capture(status = 200) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: 'email_1' }), { status });
    }) as unknown as typeof fetch;
    return { fn, calls };
  }

  it('llama a la API de Resend con Bearer, idempotencia y sin datos del visitante', async () => {
    const f = capture();
    await new ResendLeadNotifier(config, f.fn).notifyNewLead({ leadId: 'abc-123', createdAt: new Date('2026-11-06T15:00:00Z') });
    assert.equal(f.calls[0]?.url, 'https://api.resend.com/emails');
    const h = f.calls[0]?.init.headers as Record<string, string>;
    assert.equal(h.Authorization, 'Bearer re_secret');
    assert.equal(h['Idempotency-Key'], 'lead-abc-123');
    const body = JSON.parse(String(f.calls[0]?.init.body)) as Record<string, unknown>;
    assert.equal(body.from, 'PRIVAT <avisos@privatgp.com>');
    assert.deepEqual(body.to, ['equipo@privatgp.com']);
    assert.match(String(body.text), /https:\/\/privatgp\.com\/admin\//);
    assert.match(String(body.text), /12:00/); // 15:00 UTC = 12:00 en Uruguay
  });

  it('falla si Resend responde error (LeadsService lo captura y la consulta igual se guarda)', async () => {
    await assert.rejects(new ResendLeadNotifier(config, capture(422).fn).notifyNewLead({ leadId: 'x', createdAt: new Date() }), /Resend HTTP 422/);
  });
});

describe('plantillas de email con la identidad de PRIVAT', () => {
  const brandColors = Object.values(BRAND);

  it('aviso de consulta: marca, botón al panel y texto plano, sin datos del visitante', () => {
    const e = renderNewLeadEmail({ when: '06/11/26, 12:00', panelUrl: 'https://privatgp.com/admin/' });
    assert.equal(e.subject, 'Nueva consulta en la web de PRIVAT');
    assert.match(e.html, /<html lang="es">/);
    assert.match(e.html, />PRIVAT</);
    assert.match(e.html, /href="https:\/\/privatgp\.com\/admin\/"/);
    for (const c of brandColors) assert.ok(e.html.includes(c), `falta el color ${c}`);
    assert.match(e.text, /https:\/\/privatgp\.com\/admin\//);
    assert.match(e.text, /no incluye los datos del visitante/);
    assert.ok(!/<script|<img|https?:\/\/(?!privatgp\.com)/i.test(e.html), 'sin scripts, imágenes ni recursos externos');
  });

  it('aviso de consulta: escapa los valores', () => {
    assert.equal(escapeHtml(`"><script>&'`), '&quot;&gt;&lt;script&gt;&amp;&#39;');
    const e = renderNewLeadEmail({ when: '<b>x</b>', panelUrl: 'https://privatgp.com/admin/?a="><script>alert(1)</script>' });
    assert.ok(!e.html.includes('<script>'));
    assert.ok(!e.html.includes('<b>x</b>'));
  });

  it('Supabase "Reset Password": solo {{ .Token }}, sin enlaces de confirmación y con la marca', () => {
    const html = readFileSync(new URL('../../../../supabase/templates/reset-password.html', import.meta.url), 'utf8');
    assert.deepEqual(html.match(/{{[^}]*}}/g), ['{{ .Token }}']);
    assert.ok(!html.includes('ConfirmationURL'));
    assert.ok(!/<a\s|<script|<img/i.test(html), 'sin enlaces, scripts ni imágenes');
    assert.match(html, /<html lang="es">/);
    for (const c of brandColors) assert.ok(html.includes(c), `falta el color ${c}`);
  });
});
