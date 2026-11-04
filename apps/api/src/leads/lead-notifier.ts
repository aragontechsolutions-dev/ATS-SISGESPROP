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
 * Implementación provisional: el proveedor de email transaccional está "a definir"
 * en el plan. Mientras tanto se registra el aviso en el log SIN datos personales
 * (solo el id). Al elegir el proveedor se agrega una implementación nueva de
 * LeadNotifier y se cambia el provider en LeadsModule; el resto no cambia.
 * Un fallo del aviso nunca hace fallar el guardado de la consulta.
 */
export class LogLeadNotifier implements LeadNotifier {
  private readonly logger = new Logger('LeadNotifier');

  async notifyNewLead(notice: NewLeadNotice): Promise<void> {
    this.logger.log(`Nueva consulta recibida (id=${notice.leadId}). Aviso por email pendiente de proveedor.`);
  }
}
