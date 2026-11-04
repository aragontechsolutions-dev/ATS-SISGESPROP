# ADR-012 – Los administradores se desactivan, no se borran

**Contexto.** `audit_log` es inmutable: un trigger rechaza UPDATE, DELETE y TRUNCATE. Las pruebas del
Bloque D mostraron que al borrar un administrador la FK intentaba vaciar `audit_log.actor_id`
(ON DELETE SET NULL, el valor por defecto de Prisma) y el trigger lo rechazaba. Por lo tanto, la
afirmación de ADR-004 ("revocar = borrar la fila de `admin_profile`") era falsa para cualquier
administrador con historial. Borrar su usuario en Supabase también fallaba, por el CASCADE hacia
`admin_profile`.

**Decisión** (migración `20261104000000_admin_disable`).
- Nueva columna `admin_profile.disabled_at`. El `AuthGuard` rechaza a los administradores
  desactivados aunque su token sea válido.
- `audit_log.actor_id → admin_profile.id` y `admin_profile.id → auth.users.id` pasan a `ON DELETE NO ACTION`:
  un administrador con historial no se puede borrar y el historial conserva quién hizo cada cambio.
- Para revocar un acceso se completa `disabled_at` (ver guía técnica). Etapa 1 no tiene pantalla de
  gestión de usuarios.

**Corrección asociada.** La migración `20261103000100_security` daba por existente
`_prisma_migrations`, que no existe en la base auxiliar (*shadow*) de `prisma migrate diff/dev`. Se
hizo condicional. Se modificó una migración ya aplicada **solo porque todavía no existe ninguna base de
producción**. Desde el primer despliegue, las migraciones aplicadas no se tocan más.

**Consecuencias.** ADR-004 queda actualizado en este punto. Las pruebas usan un administrador fijo
(`TEST_ADMIN_ID`) y miden diferencias en `audit_log`, en lugar de contar desde cero.
