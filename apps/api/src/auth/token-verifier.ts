import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface VerifiedToken {
  /** auth.users.id */
  sub: string;
  /** Nivel de autenticación de Supabase: aal1 (contraseña) o aal2 (segundo factor). */
  aal: string | undefined;
}

/** Algoritmos asimétricos permitidos. Se rechaza HS256 y "none" (confusión de algoritmo). */
export const ALLOWED_ALGORITHMS = ['ES256', 'RS256'];

/**
 * Verifica los access tokens de Supabase Auth localmente con las claves
 * públicas del proyecto (JWKS). No requiere ningún secreto compartido.
 */
export class TokenVerifier {
  constructor(
    private readonly getKey: JWTVerifyGetKey,
    private readonly issuer: string,
  ) {}

  static forSupabase(supabaseUrl: string): TokenVerifier {
    const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30 * 1000,
    });
    return new TokenVerifier(jwks, `${supabaseUrl}/auth/v1`);
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { payload } = await jwtVerify(token, this.getKey, {
      issuer: this.issuer,
      audience: 'authenticated',
      algorithms: ALLOWED_ALGORITHMS,
      requiredClaims: ['sub', 'exp'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('sub inválido');
    return { sub: payload.sub, aal: typeof payload.aal === 'string' ? payload.aal : undefined };
  }
}
