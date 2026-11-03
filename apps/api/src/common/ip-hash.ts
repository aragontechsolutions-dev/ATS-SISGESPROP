import { createHmac } from 'node:crypto';

/**
 * La IP nunca se guarda en claro (Ley 18.331, minimización).
 * Se usa HMAC-SHA256 con secreto del servidor y no un hash simple: el espacio
 * de IPv4 es pequeño y un SHA-256 sin secreto se revierte por fuerza bruta.
 */
export function hashIp(ip: string | undefined, secret: string): string {
  return createHmac('sha256', secret).update(ip ?? 'desconocida').digest('hex');
}
