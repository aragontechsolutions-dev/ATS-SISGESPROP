# ADR-005 – RLS deny-all, REVOKE y auditoría inmutable

**Contexto.** Supabase expone las tablas de `public` mediante su Data API. En 09/2026 se reportaron
16.326 bases expuestas por mala configuración. El 30/10/2026 Supabase cambió los permisos por defecto.

**Decisión.** La migración `20261103000100_security`:
- activa RLS sin políticas en las 17 tablas y en `_prisma_migrations` (que Prisma crea sin RLS);
- hace `REVOKE ALL` a `anon` y `authenticated` sobre tablas, secuencias y funciones, y también sobre los
  privilegios por defecto;
- agrega un trigger que hace `audit_log` de solo inserción (también bloquea TRUNCATE en cascada);
- crea la FK `admin_profile.id → auth.users.id` si existe el esquema `auth`.

**Consecuencias.** Toda tabla nueva debe sumarse a una migración de seguridad: la prueba automática
falla si no. Para limpiar datos de prueba no se puede truncar `admin_profile` en cascada.
