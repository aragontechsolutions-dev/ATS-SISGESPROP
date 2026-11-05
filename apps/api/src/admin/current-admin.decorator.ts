import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { AdminPrincipal, AuthenticatedRequest } from '../auth/auth.guard.ts';

/** Administrador autenticado (lo coloca el AuthGuard global). */
export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminPrincipal => {
  const admin = ctx.switchToHttp().getRequest<AuthenticatedRequest>().admin;
  if (!admin) throw new UnauthorizedException('No autenticado');
  return admin;
});
