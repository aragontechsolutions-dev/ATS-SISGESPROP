import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { computeFee } from '@ats/pricing';
import { PrismaService } from '../../prisma/prisma.service.ts';
import type { AdminPrincipal } from '../../auth/auth.guard.ts';
import { parsePricingSnapshot } from '../../simulation/pricing-snapshot.ts';
import { CurrentAdmin } from '../current-admin.decorator.ts';
import { audit } from '../audit.ts';
import { DraftsService } from '../drafts.service.ts';
import { DEPLOY_TRIGGER, type DeployTrigger } from './deploy-trigger.ts';

/** Versión del formato de PUBLICATION.snapshot (para migraciones futuras del formato). */
export const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * Publicar: copia inmutable del borrador (contenido + parámetros) en PUBLICATION.
 * Lo público (landing y cotizador) solo lee publicaciones. Restaurar vuelve a publicar
 * una versión anterior como publicación nueva: el historial nunca se borra.
 */
@Controller('admin/publications')
export class AdminPublishController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    @Inject(DEPLOY_TRIGGER) private readonly deploy: DeployTrigger,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.publication.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: { publishedBy: { select: { email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      publishedAt: r.publishedAt,
      publishedBy: r.publishedBy.email,
      hasPricing: parsePricingSnapshot(r.snapshot) !== null,
    }));
  }

  @Post()
  @HttpCode(201)
  async publish(@CurrentAdmin() admin: AdminPrincipal) {
    const [content, pricing] = await Promise.all([this.drafts.buildContent(), this.drafts.buildPricing()]);

    const missing = this.drafts.missingSections(content);
    if (missing.length) {
      throw new UnprocessableEntityException({ message: 'Faltan secciones de contenido', missing });
    }
    const warnings: string[] = [];
    if (pricing) {
      // Defensa: cada perfil debe poder calcularse con el motor y el snapshot debe ser válido.
      for (const p of pricing.profiles) {
        try {
          computeFee({ profile: p, billableKm: 0, costPerKm: pricing.travel.costPerKm });
        } catch {
          throw new UnprocessableEntityException(`Perfil inválido: ${p.propertyTypeCode} nivel ${p.serviceLevel}`);
        }
      }
      if (!parsePricingSnapshot({ pricing })) throw new UnprocessableEntityException('Parámetros del cotizador inválidos');
      if (pricing.profiles.length === 0) warnings.push('No hay perfiles de cálculo: el cotizador responderá "sin tarifa".');
    } else {
      warnings.push('Sin base de operaciones: el cotizador público seguirá "no configurado".');
    }

    const snapshot = { schemaVersion: SNAPSHOT_SCHEMA_VERSION, content, pricing };
    return this.createPublication(admin, snapshot, 'PUBLISH', warnings);
  }

  @Post(':id/restore')
  @HttpCode(201)
  async restore(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() admin: AdminPrincipal) {
    const old = await this.prisma.publication.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Publicación inexistente');
    return this.createPublication(admin, old.snapshot as object, 'RESTORE', [`Restaurada la publicación ${id}`]);
  }

  private async createPublication(admin: AdminPrincipal, snapshot: object, action: string, warnings: string[]) {
    const publication = await this.prisma.$transaction(async (tx) => {
      const created = await tx.publication.create({ data: { snapshot, publishedById: admin.id } });
      await audit(tx, admin.id, action, 'publication', created.id, null, { publishedAt: created.publishedAt });
      return created;
    });

    // La recompilación de la web va fuera de la transacción: si falla, la publicación vale igual.
    const deploy = await this.deploy.trigger();
    if (deploy !== 'no-configurado') {
      await this.prisma.$transaction((tx) =>
        audit(tx, admin.id, 'DEPLOY_HOOK', 'publication', publication.id, null, { result: deploy }),
      );
    }
    if (deploy === 'error') warnings.push('No se pudo disparar la recompilación de la web: vuelve a publicar.');
    if (deploy === 'no-configurado') warnings.push('Recompilación automática de la web no configurada (VERCEL_DEPLOY_HOOK_URL).');

    return { id: publication.id, publishedAt: publication.publishedAt, deploy, warnings };
  }
}
