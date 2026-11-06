import { Logger } from '@nestjs/common';

export const LEAD_NOTIFIER = Symbol('LEAD_NOTIFIER');

export interface NewLeadNotice {
  leadId: string;
  createdAt: Date;
}

/** Aviso al equipo cuando llega una consulta. */
export interface LeadNotifier {
  notifyNewLead(notice: NewLeadNotice): Promise<void>;
}

/**
 * Implementación para desarrollo y pruebas (sin Resend configurado): registra el aviso
 * en el log SIN datos personales (solo el id). En producción se usa ResendLeadNotifier
 * (resend-notifier.ts). Un fallo del aviso nunca hace fallar el guardado de la consulta.
 */
export class LogLeadNotifier implements LeadNotifier {
  private readonly logger = new Logger('LeadNotifier');

  async notifyNewLead(notice: NewLeadNotice): Promise<void> {
    this.logger.log(`Nueva consulta recibida (id=${notice.leadId}). Aviso por email no configurado (Resend).`);
  }
}
