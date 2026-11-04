import { Controller, Get, Req } from '@nestjs/common';
import type { AdminPrincipal, AuthenticatedRequest } from '../auth/auth.guard.ts';

/** Perfil del administrador autenticado. Lo usa el panel para confirmar la sesión. */
@Controller('admin/me')
export class MeController {
  @Get()
  me(@Req() req: AuthenticatedRequest): AdminPrincipal {
    // El guard global garantiza que req.admin existe en rutas no públicas.
    return req.admin as AdminPrincipal;
  }
}
