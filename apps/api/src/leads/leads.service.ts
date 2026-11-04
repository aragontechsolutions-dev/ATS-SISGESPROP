import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import { hashIp } from '../common/ip-hash.ts';
import { CAPTCHA_VERIFIER, type CaptchaVerifier } from './turnstile.verifier.ts';
import { LEAD_NOTIFIER, type LeadNotifier } from './lead-notifier.ts';
import type { CreateLeadDto } from './create-lead.dto.ts';

/** Una simulación solo se puede adjuntar si es reciente (evita reutilizar ids viejos). */
const SIMULATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CAPTCHA_VERIFIER) private readonly captcha: CaptchaVerifier,
    @Inject(LEAD_NOTIFIER) private readonly notifier: LeadNotifier,
  ) {}

  async create(dto: CreateLeadDto, ip: string | undefined): Promise<{ ok: true }> {
    // 1) Anti-spam primero: sin token válido no se toca la base.
    if (!(await this.captcha.verify(dto.turnstileToken, ip))) {
      throw new ForbiddenException('No se pudo verificar que la consulta la envía una persona');
    }

    const propertyType = dto.propertyTypeCode
      ? await this.prisma.propertyType.findUnique({ where: { code: dto.propertyTypeCode }, select: { id: true } })
      : null;
    if (dto.propertyTypeCode && !propertyType) throw new BadRequestException('Tipo de propiedad inválido');

    // 2) La simulación se adjunta solo si existe, es reciente y no está ya asociada a otra consulta.
    let simulationId: string | undefined;
    if (dto.simulationId) {
      const sim = await this.prisma.simulation.findUnique({
        where: { id: dto.simulationId },
        select: { id: true, createdAt: true, lead: { select: { id: true } } },
      });
      if (sim && !sim.lead && Date.now() - sim.createdAt.getTime() <= SIMULATION_MAX_AGE_MS) simulationId = sim.id;
    }

    // 3) Consulta + consentimiento en una sola transacción (Ley 18.331).
    const ipHash = hashIp(ip, this.config.ipHashSecret);
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone?.trim() || null,
          propertyTypeId: propertyType?.id ?? null,
          simulationId: simulationId ?? null,
          message: dto.message?.trim() || null,
        },
        select: { id: true, createdAt: true },
      });
      await tx.consentRecord.create({
        data: { leadId: created.id, policyVersion: dto.policyVersion, ipHash },
      });
      return created;
    });

    // 4) Aviso al equipo: nunca hace fallar el guardado.
    try {
      await this.notifier.notifyNewLead({ leadId: lead.id, createdAt: lead.createdAt });
    } catch {
      this.logger.error(`No se pudo enviar el aviso de la consulta ${lead.id}`);
    }
    return { ok: true };
  }
}
