import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.ts';
import { PrismaService } from '../prisma/prisma.service.ts';

/**
 * Describe un error de conexión a la base SIN datos sensibles: solo el código (p. ej. 28P01 =
 * contraseña incorrecta, ENOTFOUND = host inexistente) y el mensaje, con cualquier URL de conexión
 * tapada. Los mensajes de `pg` no incluyen la contraseña, pero se tapan URLs por si acaso.
 */
export function describeDbError(err: unknown): string {
  const e = err as { code?: unknown; message?: unknown; cause?: unknown } | null;
  const cause = e?.cause as { code?: unknown; message?: unknown } | undefined;
  const code = String(e?.code ?? cause?.code ?? 'sin código');
  const raw = String(cause?.message ?? e?.message ?? 'sin mensaje');
  const message = raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[url oculta]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  return `${code}: ${message}`;
}

/** Health check para Render. No expone versión, entorno ni detalles internos al cliente. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger('Health');
  /** Solo se registra al cambiar de estado: Render consulta /health cada pocos segundos. */
  private lastOk: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      if (this.lastOk !== false) this.logger.error(`Base de datos no disponible (${describeDbError(err)})`);
      this.lastOk = false;
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
    if (this.lastOk === false) this.logger.log('Base de datos disponible de nuevo');
    this.lastOk = true;
    return { status: 'ok' };
  }
}
