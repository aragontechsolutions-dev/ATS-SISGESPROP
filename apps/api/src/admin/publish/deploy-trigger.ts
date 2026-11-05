import { Logger } from '@nestjs/common';

export const DEPLOY_TRIGGER = Symbol('DEPLOY_TRIGGER');

export type DeployResult = 'disparado' | 'error' | 'no-configurado';

export interface DeployTrigger {
  trigger(): Promise<DeployResult>;
}

/**
 * Llama al deploy hook de Vercel (POST) para regenerar la landing con el contenido
 * publicado (plan, sección 3). Un fallo NO revierte la publicación: queda registrado
 * y se puede reintentar publicando de nuevo.
 */
export class VercelDeployTrigger implements DeployTrigger {
  private readonly logger = new Logger(VercelDeployTrigger.name);

  constructor(
    private readonly hookUrl: string | null,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async trigger(): Promise<DeployResult> {
    if (!this.hookUrl) return 'no-configurado';
    try {
      const res = await this.fetchFn(this.hookUrl, { method: 'POST', signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`El deploy hook respondió HTTP ${res.status}`);
        return 'error';
      }
      return 'disparado';
    } catch {
      this.logger.warn('No se pudo llamar al deploy hook');
      return 'error';
    }
  }
}
