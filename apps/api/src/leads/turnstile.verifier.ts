import { Logger } from '@nestjs/common';

export const CAPTCHA_VERIFIER = Symbol('CAPTCHA_VERIFIER');

export interface CaptchaVerifier {
  /** true solo si Cloudflare confirma el token. Ante cualquier error: false (falla cerrado). */
  verify(token: string, remoteIp: string | undefined): Promise<boolean>;
}

/**
 * Verificación de Cloudflare Turnstile en el servidor.
 * Endpoint, parámetros (secret, response, remoteip) y campos de respuesta tomados del
 * plugin oficial @cloudflare/pages-plugin-turnstile 1.0.2 (ver docs/adr/ADR-009).
 */
export class TurnstileVerifier implements CaptchaVerifier {
  static readonly SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  private readonly logger = new Logger(TurnstileVerifier.name);

  constructor(
    private readonly secret: string,
    private readonly allowedHostnames: string[],
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs = 5_000,
  ) {}

  async verify(token: string, remoteIp: string | undefined): Promise<boolean> {
    const form = new FormData();
    form.set('secret', this.secret);
    form.set('response', token);
    if (remoteIp) form.set('remoteip', remoteIp);

    try {
      const res = await this.fetchFn(TurnstileVerifier.SITEVERIFY_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        this.logger.warn(`Turnstile respondió HTTP ${res.status}`);
        return false;
      }
      const data = (await res.json()) as { success?: unknown; hostname?: unknown; 'error-codes'?: unknown };
      if (data.success !== true) {
        this.logger.warn(`Turnstile rechazó el token: ${JSON.stringify(data['error-codes'] ?? [])}`);
        return false;
      }
      if (this.allowedHostnames.length > 0) {
        const host = typeof data.hostname === 'string' ? data.hostname.toLowerCase() : '';
        if (!this.allowedHostnames.includes(host)) {
          this.logger.warn('Token de Turnstile emitido para un dominio no permitido');
          return false;
        }
      }
      return true;
    } catch {
      this.logger.warn('No se pudo verificar Turnstile (red o tiempo de espera)');
      return false;
    }
  }
}
