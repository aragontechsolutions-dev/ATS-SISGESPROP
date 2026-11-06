/**
 * Configuración de la API leída y validada desde variables de entorno.
 * Si falta una variable crítica o es inválida, la API no arranca (fail fast).
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  supabaseUrl: string;
  corsOrigins: string[];
  ipHashSecret: string;
  trustProxyHops: number;
  /** Clave secreta de Cloudflare Turnstile (solo en el servidor). */
  turnstileSecretKey: string;
  /** Dominios desde los que se acepta un token de Turnstile (vacío = no se valida el hostname). */
  turnstileAllowedHostnames: string[];
  /** Deploy hook de Vercel: "Publicar" dispara la recompilación de la web. Opcional. */
  vercelDeployHookUrl: string | null;
  /** Aviso de consultas por email con Resend. Obligatorio en producción; null = solo log. */
  resend: { apiKey: string; from: string; to: string[]; panelUrl: string } | null;
}

const EMAIL_RE = /^[^\s@<>"',]{1,64}@[^\s@<>"',]{1,190}\.[a-z]{2,}$/i;
/** Remitente: "correo@dominio" o "Nombre <correo@dominio>". */
const FROM_RE = /^(?:[^<>"\r\n]{1,60} <[^\s@<>"',]{1,64}@[^\s@<>"',]{1,190}\.[a-z]{2,}>|[^\s@<>"',]{1,64}@[^\s@<>"',]{1,190}\.[a-z]{2,})$/i;

function loadResend(env: NodeJS.ProcessEnv, prod: boolean): AppConfig['resend'] {
  const names = ['RESEND_API_KEY', 'LEAD_NOTIFY_FROM', 'LEAD_NOTIFY_TO', 'PANEL_URL'] as const;
  const defined = names.filter((n) => env[n]?.trim());
  if (defined.length === 0) {
    if (prod) throw new Error('En producción el aviso por email es obligatorio: defina RESEND_API_KEY, LEAD_NOTIFY_FROM, LEAD_NOTIFY_TO y PANEL_URL');
    return null;
  }
  const missing = names.filter((n) => !env[n]?.trim());
  if (missing.length) throw new Error(`Configuración de Resend incompleta, faltan: ${missing.join(', ')}`);

  const from = env.LEAD_NOTIFY_FROM!.trim();
  if (!FROM_RE.test(from)) throw new Error('LEAD_NOTIFY_FROM inválido (ej.: PRIVAT <avisos@privatgp.com>)');
  const to = env.LEAD_NOTIFY_TO!.split(',').map((e) => e.trim()).filter(Boolean);
  if (to.length === 0 || to.length > 10 || !to.every((e) => EMAIL_RE.test(e))) {
    throw new Error('LEAD_NOTIFY_TO inválido: de 1 a 10 emails separados por coma');
  }
  const panelUrl = parseUrl('PANEL_URL', env.PANEL_URL!.trim(), true, prod).toString();
  return { apiKey: env.RESEND_API_KEY!.trim(), from, to, panelUrl };
}

export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Desactiva el límite de peticiones SOLO fuera de producción (escaneos OWASP ZAP en un
 * entorno de prueba). En producción loadConfig se niega a arrancar si está activo.
 */
export function isRateLimitDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RATE_LIMIT_DISABLED === 'true' && env.NODE_ENV !== 'production';
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Variable de entorno requerida no definida: ${name}`);
  return value;
}

function parseUrl(name: string, value: string, httpsOnlyInProd: boolean, prod: boolean): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} no es una URL válida`);
  }
  if (httpsOnlyInProd && prod && url.protocol !== 'https:') {
    throw new Error(`${name} debe usar https en producción`);
  }
  return url;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV debe ser development, test o production');
  }
  const prod = nodeEnv === 'production';
  if (prod && env.RATE_LIMIT_DISABLED === 'true') {
    throw new Error('RATE_LIMIT_DISABLED no está permitido en producción');
  }

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('PORT inválido');

  const supabaseUrl = parseUrl('SUPABASE_URL', required(env, 'SUPABASE_URL'), true, prod)
    .toString()
    .replace(/\/$/, '');

  const corsOrigins = required(env, 'CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => {
      const u = parseUrl('CORS_ORIGINS', o, true, prod);
      if (u.origin !== o) throw new Error(`CORS_ORIGINS: "${o}" debe ser un origen exacto (sin ruta ni barra final)`);
      return o;
    });
  if (corsOrigins.includes('*')) throw new Error('CORS_ORIGINS no admite "*"');

  const ipHashSecret = required(env, 'IP_HASH_SECRET');
  if (ipHashSecret.length < 32) throw new Error('IP_HASH_SECRET debe tener al menos 32 caracteres');

  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
    throw new Error('TRUST_PROXY_HOPS inválido (0 a 5)');
  }

  const turnstileAllowedHostnames = (env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (prod && turnstileAllowedHostnames.length === 0) {
    throw new Error('TURNSTILE_ALLOWED_HOSTNAMES es obligatorio en producción');
  }

  const hook = env.VERCEL_DEPLOY_HOOK_URL?.trim() || null;
  if (hook) parseUrl('VERCEL_DEPLOY_HOOK_URL', hook, true, true);

  return {
    nodeEnv,
    port,
    databaseUrl: required(env, 'DATABASE_URL'),
    supabaseUrl,
    corsOrigins,
    ipHashSecret,
    trustProxyHops,
    turnstileSecretKey: required(env, 'TURNSTILE_SECRET_KEY'),
    turnstileAllowedHostnames,
    vercelDeployHookUrl: hook,
    resend: loadResend(env, prod),
  };
}
