import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.ts';

export class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;
}

const PAGE_SIZE = 50;

/** Registro de cambios: quién cambió qué y cuándo (solo lectura). */
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: AuditQueryDto) {
    const page = q.page ?? 1;
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        orderBy: { id: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { actor: { select: { email: true } } },
      }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((r) => ({
        id: r.id.toString(),
        createdAt: r.createdAt,
        actor: r.actor?.email ?? null,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        before: r.beforeData,
        after: r.afterData,
      })),
    };
  }
}
