import { Body, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service.ts';
import type { AdminPrincipal } from '../../auth/auth.guard.ts';
import { CurrentAdmin } from '../current-admin.decorator.ts';
import { audit } from '../audit.ts';
import { toCsv } from './csv.ts';

const STATUSES = ['NUEVA', 'CONTACTADA', 'CERRADA'] as const;
type Status = (typeof STATUSES)[number];
const PAGE_SIZE = 50;
const EXPORT_LIMIT = 5000;

export class LeadsQueryDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: Status;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;
}

export class UpdateLeadStatusDto {
  @IsIn(STATUSES)
  status!: Status;
}

/** Consultas recibidas (datos personales: solo administradores con 2FA; todo se audita). */
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly prisma: PrismaService) {}

  private query(status?: Status) {
    return {
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' as const },
      include: {
        propertyType: { select: { name: true } },
        simulation: { select: { serviceLevel: true, lowFee: true, highFee: true, annualFee: true, distanceKm: true } },
        consent: { select: { policyVersion: true, grantedAt: true } },
      },
    };
  }

  @Get()
  async list(@Query() q: LeadsQueryDto) {
    const page = q.page ?? 1;
    const [total, rows] = await Promise.all([
      this.prisma.lead.count({ where: q.status ? { status: q.status } : {} }),
      this.prisma.lead.findMany({ ...this.query(q.status), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        name: l.name,
        email: l.email,
        phone: l.phone,
        propertyType: l.propertyType?.name ?? null,
        message: l.message,
        status: l.status,
        simulation: l.simulation
          ? {
              serviceLevel: l.simulation.serviceLevel,
              lowFee: l.simulation.lowFee.toFixed(2),
              highFee: l.simulation.highFee.toFixed(2),
              annualFee: l.simulation.annualFee.toFixed(2),
              distanceKm: l.simulation.distanceKm.toFixed(2),
            }
          : null,
        consent: l.consent,
      })),
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.lead.findUnique({ where: { id }, select: { status: true } });
      if (!before) throw new NotFoundException('Consulta inexistente');
      const after = await tx.lead.update({ where: { id }, data: { status: dto.status }, select: { id: true, status: true } });
      await audit(tx, admin.id, 'UPDATE_STATUS', 'lead', id, before, { status: after.status });
      return after;
    });
  }

  /** Exportación CSV (plan 4.4). Se registra en auditoría porque saca datos personales del sistema. */
  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="consultas.csv"')
  @Header('Cache-Control', 'no-store')
  async exportCsv(@Query() q: LeadsQueryDto, @CurrentAdmin() admin: AdminPrincipal): Promise<string> {
    const rows = await this.prisma.lead.findMany({ ...this.query(q.status), take: EXPORT_LIMIT });
    await this.prisma.$transaction((tx) =>
      audit(tx, admin.id, 'EXPORT_CSV', 'lead', q.status ?? 'TODAS', null, { rows: rows.length }),
    );
    return toCsv(
      ['Fecha', 'Nombre', 'Email', 'Teléfono', 'Tipo de propiedad', 'Estado', 'Mensaje', 'Nivel', 'Abono baja USD', 'Abono alta USD', 'Anual USD', 'Distancia km', 'Política aceptada'],
      rows.map((l) => [
        l.createdAt.toISOString(),
        l.name,
        l.email,
        l.phone,
        l.propertyType?.name,
        l.status,
        l.message,
        l.simulation?.serviceLevel,
        l.simulation?.lowFee.toFixed(2),
        l.simulation?.highFee.toFixed(2),
        l.simulation?.annualFee.toFixed(2),
        l.simulation?.distanceKm.toFixed(2),
        l.consent?.policyVersion,
      ]),
    );
  }
}
