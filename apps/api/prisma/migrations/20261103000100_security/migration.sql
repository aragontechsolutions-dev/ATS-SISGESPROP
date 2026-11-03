-- ============================================================================
-- Seguridad de la base de datos (Etapa 1)
-- Regla: el navegador nunca accede a la base. Solo la API (rol propietario de
-- las tablas, vía Prisma) lee y escribe. Para la Data API de Supabase
-- (roles anon / authenticated) todas las tablas quedan cerradas:
--   1) RLS activa sin políticas  -> deniega todo a roles sin BYPASSRLS.
--   2) REVOKE de todos los privilegios a anon y authenticated.
-- Esto también cubre el cambio de permisos por defecto de Supabase (30/10/2026).
-- Una prueba automática (test/db-security) verifica que anon no lee nada.
-- ============================================================================

-- Los roles anon/authenticated existen en Supabase. Fuera de Supabase
-- (desarrollo local) se crean sin login para que la migración sea idéntica.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_profile','audit_log','content_block','service_level','faq',
    'testimonial','media_asset','publication','property_type','calc_profile',
    'pricing_param','travel_config','travel_tier','locality','simulation',
    'lead','consent_record'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Tabla interna de Prisma (historial de migraciones): también cerrada.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Objetos futuros creados por el rol de migraciones: sin permisos por defecto.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- audit_log inmutable: solo INSERT. UPDATE, DELETE y TRUNCATE se rechazan.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es de solo inserción (operación % rechazada)', TG_OP;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_log_immutable() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_immutable();

-- ----------------------------------------------------------------------------
-- admin_profile.id = auth.users.id (solo si existe el esquema auth de Supabase).
-- Prisma no gestiona el esquema auth, por eso la FK se crea aquí.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE public.admin_profile
      ADD CONSTRAINT admin_profile_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
