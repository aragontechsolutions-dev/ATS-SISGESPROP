# ADR-004 – JWT de Supabase verificado con JWKS, 2FA obligatorio, rol en base

**Contexto.** El panel usa Supabase Auth. La API debe verificar sesiones sin compartir secretos y exigir
segundo factor.

**Decisión.**
- Verificación local con `jose` contra `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (caché de
  10 min). Solo algoritmos ES256/RS256; `iss` = `${SUPABASE_URL}/auth/v1`; `aud` = `authenticated`.
- Exigir `aal = aal2` (claim de Supabase cuando el usuario completó el segundo factor).
- El rol se lee de `admin_profile` por `sub`; nunca del token ni de `user_metadata`.
- Guard global deny-by-default: solo las rutas con `@Public()` quedan abiertas.

**Consecuencias.** ~~Revocar un acceso es borrar la fila de `admin_profile`.~~ Actualizado por [ADR-012](ADR-012-administradores-se-desactivan.md): se revoca completando `disabled_at` (efecto inmediato). Requiere
habilitar MFA TOTP en el proyecto Supabase. Supuesto a verificar al crear el proyecto: que el proyecto
emita tokens con claves asimétricas (por defecto en proyectos creados después del 01/05/2025, según la
investigación).
