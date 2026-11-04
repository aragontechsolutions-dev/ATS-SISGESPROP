import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.ts';
import { IS_PUBLIC } from './public.decorator.ts';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier.ts';

export interface AdminPrincipal {
  id: string;
  email: string;
  role: 'ADMIN';
}

export type AuthenticatedRequest = Request & { admin?: AdminPrincipal };

/**
 * Guard global (deny by default):
 *  1. Rutas con @Public() pasan.
 *  2. Exige "Authorization: Bearer <JWT>" válido (firma JWKS, iss, aud, exp, alg).
 *  3. Exige segundo factor (aal2), requisito del plan para el panel.
 *  4. El rol se lee de admin_profile en la base, nunca del token ni de user_metadata.
 *  5. Un administrador desactivado (disabled_at) no entra aunque su token sea válido.
 * Los mensajes de error son genéricos para no filtrar información.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/.exec(header) : null;
    if (!match?.[1]) throw new UnauthorizedException('No autenticado');

    let token;
    try {
      token = await this.verifier.verify(match[1]);
    } catch {
      throw new UnauthorizedException('No autenticado');
    }

    if (token.aal !== 'aal2') throw new ForbiddenException('Se requiere segundo factor de autenticación');

    const profile = await this.prisma.adminProfile.findUnique({ where: { id: token.sub } });
    // Perfil inexistente, de otro rol o desactivado (acceso revocado): mismo mensaje genérico.
    if (!profile || profile.role !== 'ADMIN' || profile.disabledAt) {
      this.logger.warn(`Acceso denegado a usuario sin perfil de administrador (sub=${token.sub})`);
      throw new ForbiddenException('Acceso denegado');
    }

    req.admin = { id: profile.id, email: profile.email, role: profile.role };
    return true;
  }
}
