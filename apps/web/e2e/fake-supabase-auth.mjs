// SOLO PARA PRUEBAS E2E. Servidor mínimo que imita los endpoints de Supabase Auth
// que usa @supabase/auth-js 2.118.0 (verificados en su código fuente):
//   POST /auth/v1/token?grant_type=password   GET /auth/v1/user
//   POST /auth/v1/factors                      POST /auth/v1/factors/:id/challenge
//   POST /auth/v1/factors/:id/verify           POST /auth/v1/logout
//   POST /auth/v1/recover   POST /auth/v1/verify (type recovery)   PUT /auth/v1/user (contraseña)
//   GET  /auth/v1/.well-known/jwks.json        (la API real verifica los tokens con esto)
// Y Storage (Etapa D4), como @supabase/storage-js 2.118.0: subir POST /storage/v1/object/{bucket}/{ruta}
// (x-upsert), borrar DELETE /storage/v1/object/{bucket} { prefixes }, leer GET
// /storage/v1/object/public/{bucket}/{ruta}. Escribir exige la clave (FAKE_STORAGE_KEY) en
// apikey y Bearer; leer es público, como un bucket público.
// Emite JWT ES256 con aal1 (contraseña o código de recuperación "654321") y aal2 (tras el
// código TOTP "123456"). Como Supabase Auth (internal/api/user.go), cambiar la contraseña de
// un usuario con 2FA exige una sesión aal2.
//
// Uso: FAKE_AUTH_PORT=54321 node e2e/fake-supabase-auth.mjs
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from 'jose';

const PORT = Number(process.env.FAKE_AUTH_PORT ?? 54321);
const ORIGIN = `http://127.0.0.1:${PORT}`;
export const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'e2e@test.local', password: 'Clave-de-prueba-1' };
export const TOTP_CODE = '123456';
export const RECOVERY_CODE = '654321';
const INITIAL_PASSWORD = USER.password;
let recoveryRequested = false;
const STORAGE_KEY = process.env.FAKE_STORAGE_KEY ?? 'e2e.fake.key';
const objects = new Map(); // "bucket/ruta" -> { type, data }

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
const readRaw = (req) => new Promise((r) => { const parts = []; req.on('data', (c) => parts.push(c)); req.on('end', () => r(Buffer.concat(parts))); });
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, ORIGIN);
    const p = url.pathname;
    if (req.method === 'OPTIONS') return send(res, 204);
    // ---- Storage ----
    let sm = p.match(/^\/storage\/v1\/object\/public\/([a-z0-9-]+)\/(.+)$/);
    if (req.method === 'GET' && sm) {
      const o = objects.get(`${sm[1]}/${sm[2]}`);
      if (!o) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      res.writeHead(200, { 'content-type': o.type, 'cache-control': o.cache ?? 'no-cache' });
      return res.end(o.data);
    }
    if (p.startsWith('/storage/v1/object/')) {
      const authorized = req.headers.apikey === STORAGE_KEY && req.headers.authorization === `Bearer ${STORAGE_KEY}`;
      if (!authorized) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      sm = p.match(/^\/storage\/v1\/object\/([a-z0-9-]+)\/(.+)$/);
      if (req.method === 'POST' && sm) {
        const key = `${sm[1]}/${sm[2]}`;
        if (objects.has(key) && req.headers['x-upsert'] !== 'true') return send(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
        objects.set(key, { type: req.headers['content-type'], cache: req.headers['cache-control'], data: await readRaw(req) });
        return send(res, 200, { Key: key, Id: randomUUID() });
      }
      sm = p.match(/^\/storage\/v1\/object\/([a-z0-9-]+)$/);
      if (req.method === 'DELETE' && sm) {
        const b = await readBody(req);
        const removed = (b.prefixes ?? []).filter((x) => objects.delete(`${sm[1]}/${x}`));
        return send(res, 200, removed.map((name) => ({ name })));
      }
    }
    if (req.method === 'GET' && p === '/__test__/storage') return send(res, 200, { keys: [...objects.keys()] });
    if (req.method === 'GET' && p === '/auth/v1/.well-known/jwks.json') return send(res, 200, { keys: [jwk] });
    if (req.method === 'POST' && p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const b = await readBody(req);
      if (b.email !== USER.email || b.password !== USER.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return send(res, 200, await session('aal1'));
    }
    if (req.method === 'GET' && p === '/auth/v1/user') return send(res, 200, user());
    if (req.method === 'POST' && p === '/auth/v1/recover') {
      const b = await readBody(req);
      if (b.email === USER.email) recoveryRequested = true;
      return send(res, 200, {}); // misma respuesta exista o no el email
    }
    if (req.method === 'POST' && p === '/auth/v1/verify') {
      const b = await readBody(req);
      if (b.type !== 'recovery' || !recoveryRequested || b.email !== USER.email || b.token !== RECOVERY_CODE) {
        return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      }
      recoveryRequested = false; // un solo uso
      return send(res, 200, await session('aal1'));
    }
    if (req.method === 'PUT' && p === '/auth/v1/user') {
      const b = await readBody(req);
      const claims = decodeJwt((req.headers.authorization ?? '').replace(/^Bearer /, ''));
      if (factors.some((f) => f.status === 'verified') && claims.aal !== 'aal2') {
        return send(res, 401, { code: 401, error_code: 'insufficient_aal', msg: 'AAL2 session is required to update email or password when MFA is enabled.' });
      }
      if (b.password === USER.password) return send(res, 422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
      if (b.password) USER.password = b.password;
      return send(res, 200, user());
    }
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
    // Solo pruebas: admin.e2e cambia la contraseña; esto la restaura para las pruebas siguientes.
    if (req.method === 'POST' && p === '/__test__/reset-password') {
      USER.password = INITIAL_PASSWORD;
      recoveryRequested = false;
      return send(res, 204);
    }
    send(res, 404, { msg: 'not found (fake auth)' });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`fake-supabase-auth escuchando en ${ORIGIN}`));
