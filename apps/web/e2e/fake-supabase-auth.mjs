// SOLO PARA PRUEBAS E2E. Servidor mínimo que imita los endpoints de Supabase Auth
// que usa @supabase/auth-js 2.118.0 (verificados en su código fuente):
//   POST /auth/v1/token?grant_type=password   GET /auth/v1/user
//   POST /auth/v1/factors                      POST /auth/v1/factors/:id/challenge
//   POST /auth/v1/factors/:id/verify           POST /auth/v1/logout
//   GET  /auth/v1/.well-known/jwks.json        (la API real verifica los tokens con esto)
// Emite JWT ES256 con aal1 (contraseña) y aal2 (tras el código TOTP "123456").
//
// Uso: FAKE_AUTH_PORT=54321 node e2e/fake-supabase-auth.mjs
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const PORT = Number(process.env.FAKE_AUTH_PORT ?? 54321);
const ORIGIN = `http://127.0.0.1:${PORT}`;
export const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'e2e@test.local', password: 'Clave-de-prueba-1' };
export const TOTP_CODE = '123456';

const { privateKey, publicKey } = await generateKeyPair('ES256');
// kid nuevo en cada arranque (como una rotación real): la API cachea el JWKS por kid y,
// con el mismo kid y otra clave, rechazaría los tokens hasta que venza su caché.
const jwk = { ...(await exportJWK(publicKey)), kid: `fake-e2e-${randomUUID()}`, alg: 'ES256', use: 'sig' };
const factors = []; // { id, factor_type: 'totp', status: 'unverified' | 'verified', friendly_name }

async function session(aal) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = await new SignJWT({ email: USER.email, role: 'authenticated', aal, amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: now }] })
    .setProtectedHeader({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' })
    .setSubject(USER.id).setIssuer(`${ORIGIN}/auth/v1`).setAudience('authenticated')
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(privateKey);
  return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: randomUUID(), user: user() };
}
const user = () => ({ id: USER.id, aud: 'authenticated', role: 'authenticated', email: USER.email, factors: [...factors], app_metadata: {}, user_metadata: {} });

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, ORIGIN);
    const p = url.pathname;
    if (req.method === 'OPTIONS') return send(res, 204);
    if (req.method === 'GET' && p === '/auth/v1/.well-known/jwks.json') return send(res, 200, { keys: [jwk] });
    if (req.method === 'POST' && p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const b = await readBody(req);
      if (b.email !== USER.email || b.password !== USER.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return send(res, 200, await session('aal1'));
    }
    if (req.method === 'GET' && p === '/auth/v1/user') return send(res, 200, user());
    if (req.method === 'POST' && p === '/auth/v1/factors') {
      const b = await readBody(req);
      const f = { id: randomUUID(), factor_type: 'totp', status: 'unverified', friendly_name: b.friendly_name };
      factors.push(f);
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
      return send(res, 200, { id: f.id, type: 'totp', friendly_name: b.friendly_name, totp: { qr_code: svg, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/e2e' } });
    }
    let m = p.match(/^\/auth\/v1\/factors\/([^/]+)\/challenge$/);
    if (req.method === 'POST' && m) return send(res, 200, { id: randomUUID(), type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 });
    m = p.match(/^\/auth\/v1\/factors\/([^/]+)\/verify$/);
    if (req.method === 'POST' && m) {
      const b = await readBody(req);
      const f = factors.find((x) => x.id === m[1]);
      if (!f || b.code !== TOTP_CODE) return send(res, 422, { code: 422, error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
      f.status = 'verified';
      return send(res, 200, await session('aal2'));
    }
    if (req.method === 'POST' && p === '/auth/v1/logout') return send(res, 204);
    send(res, 404, { msg: 'not found (fake auth)' });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`fake-supabase-auth escuchando en ${ORIGIN}`));
