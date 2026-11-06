import { Logger } from '@nestjs/common';
import type { LeadNotifier, NewLeadNotice } from './lead-notifier.ts';

export interface ResendConfig {
  apiKey: string;
  /** Remitente con dominio verificado en Resend, p. ej. "PRIVAT <avisos@privatgp.com>". */
  from: string;
  /** Destinatarios del equipo de PRIVAT. */
  to: string[];
  /** URL del panel (https), incluida en el aviso. */
  panelUrl: string;
}

/**
 * Aviso al equipo por email con Resend (proveedor aprobado por el cliente).
 * API verificada en el SDK oficial `resend` 6.37.0: POST https://api.resend.com/emails,
 * Authorization: Bearer, cuerpo JSON { from, to, subject, text, html } e Idempotency-Key.
 *
 * Privacidad (Ley 18.331, minimización): el correo NO incluye datos del visitante
 * (nombre, email, teléfono ni mensaje). Solo avisa que hay una consulta nueva y enlaza
 * al panel, donde se ve con segundo factor. Así los datos personales no pasan por el
 * proveedor de email ni quedan copiados en bandejas de correo.
 */
export class ResendLeadNotifier implements LeadNotifier {
  static readonly ENDPOINT = 'https://api.resend.com/emails';
  private readonly logger = new Logger('LeadNotifier');

  constructor(
    private readonly config: ResendConfig,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async notifyNewLead(notice: NewLeadNotice): Promise<void> {
    const when = notice.createdAt.toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' });
    const text = [
      'Se recibió una nueva consulta desde la web de PRIVAT.',
      `Fecha: ${when} (hora de Uruguay).`,
      '',
      `Para verla, ingresa al panel (pestaña Consultas): ${this.config.panelUrl}`,
      '',
      'Por privacidad, este aviso no incluye los datos del visitante.',
    ].join('\n');
    const html = `<p>Se recibió una nueva consulta desde la web de PRIVAT.</p>
<p>Fecha: ${when} (hora de Uruguay).</p>
<p>Para verla, ingresa al <a href="${this.config.panelUrl}">panel</a> (pestaña <strong>Consultas</strong>).</p>
<p style="color:#686B67">Por privacidad, este aviso no incluye los datos del visitante.</p>`;

    const res = await this.fetchFn(ResendLeadNotifier.ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        // Evita avisos duplicados si el envío se reintenta.
        'Idempotency-Key': `lead-${notice.leadId}`,
      },
      body: JSON.stringify({
        from: this.config.from,
        to: this.config.to,
        subject: 'Nueva consulta en la web de PRIVAT',
        text,
        html,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      // Solo el código HTTP: nunca la clave ni datos del visitante.
      this.logger.error(`Resend respondió HTTP ${res.status} al avisar la consulta ${notice.leadId}`);
      throw new Error(`Resend HTTP ${res.status}`);
    }
    this.logger.log(`Aviso por email enviado (consulta ${notice.leadId}).`);
  }
}
