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
}

export const APP_CONFIG = Symbol('APP_CONFIG');

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

  return {
    nodeEnv,
    port,
    databaseUrl: required(env, 'DATABASE_URL'),
    supabaseUrl,
    corsOrigins,
    ipHashSecret,
    trustProxyHops,
  };
}
