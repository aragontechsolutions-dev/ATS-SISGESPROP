import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { AppModule } from '../src/app.module.ts';
import { configureApp } from '../src/bootstrap.ts';
import { APP_CONFIG, type AppConfig } from '../src/config/app-config.ts';
import { TOKEN_VERIFIER, TokenVerifier } from '../src/auth/token-verifier.ts';
import { PrismaService } from '../src/prisma/prisma.service.ts';
import { CAPTCHA_VERIFIER, type CaptchaVerifier } from '../src/leads/turnstile.verifier.ts';
import { LEAD_NOTIFIER, type LeadNotifier, type NewLeadNotice } from '../src/leads/lead-notifier.ts';

/** Anti-spam simulado: solo el token "ok" es válido. */
export const fakeCaptcha: CaptchaVerifier = { verify: async (token) => token === 'ok' };

/** Notificador simulado que registra los avisos para poder comprobarlos. */
export function recordingNotifier(): LeadNotifier & { notices: NewLeadNotice[] } {
  const notices: NewLeadNotice[] = [];
  return { notices, notifyNewLead: async (n) => void notices.push(n) };
}

/** Base de datos de pruebas. Sin esta variable, las pruebas de integración se omiten. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const ISSUER = 'https://test-project.supabase.co/auth/v1';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    databaseUrl: TEST_DATABASE_URL ?? 'postgresql://invalid',
    supabaseUrl: 'https://test-project.supabase.co',
    corsOrigins: ['http://localhost:5173'],
    ipHashSecret: 'test-secret-test-secret-test-secret-123',
    trustProxyHops: 0,
    turnstileSecretKey: 'test-turnstile-secret',
    turnstileAllowedHostnames: [],
    ...overrides,
  };
}

/** Par de claves ES256 que simula el JWKS de Supabase Auth. */
export async function createKeys() {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  return { privateKey, verifier: new TokenVerifier(jwks, ISSUER) };
}

export async function signToken(
  privateKey: CryptoKey,
  claims: { sub: string; aal?: string },
  opts: { issuer?: string; audience?: string; expiresIn?: string | number } = {},
): Promise<string> {
  return new SignJWT({ aal: claims.aal ?? 'aal2', role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setSubject(claims.sub)
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '5m')
    .sign(privateKey);
}

export async function createApp(
  verifier: TokenVerifier,
  config = testConfig(),
  notifier: LeadNotifier = recordingNotifier(),
) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifier)
    .overrideProvider(CAPTCHA_VERIFIER)
    .useValue(fakeCaptcha)
    .overrideProvider(LEAD_NOTIFIER)
    .useValue(notifier)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureApp(app, config);
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as { port: number };
  return { app, baseUrl: `http://127.0.0.1:${address.port}`, prisma: app.get(PrismaService) };
}

/**
 * Limpia las tablas de prueba. audit_log es inmutable: no se puede truncar ni en
 * cascada, por eso admin_profile se borra con DELETE (las filas de auditoría de
 * prueba no tienen actor).
 */
export async function resetData(prisma: PrismaService): Promise<void> {
  await prisma.$executeRaw`TRUNCATE consent_record, lead, simulation, publication`;
  await prisma.$executeRaw`DELETE FROM admin_profile`;
}

/** Crea un administrador (y su auth.users si existe el esquema de Supabase). */
export async function insertAdmin(prisma: PrismaService, id: string, email = 'admin@test.local'): Promise<void> {
  const hasAuth = await prisma.$queryRaw<Array<{ exists: boolean }>>`SELECT to_regclass('auth.users') IS NOT NULL AS exists`;
  if (hasAuth[0]?.exists) {
    await prisma.$executeRaw`INSERT INTO auth.users (id, email) VALUES (${id}::uuid, ${email}) ON CONFLICT (id) DO NOTHING`;
  }
  await prisma.adminProfile.create({ data: { id, email, fullName: 'Admin Test' } });
}
