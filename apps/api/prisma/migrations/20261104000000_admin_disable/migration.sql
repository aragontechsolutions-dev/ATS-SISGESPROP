-- ============================================================================
-- Administradores: se DESACTIVAN (disabled_at), no se borran.
-- audit_log es inmutable: borrar un administrador con historial obligaría a
-- modificar sus filas de auditoría (el trigger lo rechaza). Por eso las FK son
-- NO ACTION y el acceso se revoca con disabled_at (el AuthGuard lo rechaza).
-- ============================================================================

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_fkey";

-- AlterTable
ALTER TABLE "admin_profile" ADD COLUMN     "disabled_at" TIMESTAMPTZ(6);

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- admin_profile.id -> auth.users.id: de CASCADE a NO ACTION (solo si existe el esquema de Supabase).
-- Borrar en Supabase un usuario administrador con historial fallará: hay que desactivarlo.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE public.admin_profile DROP CONSTRAINT IF EXISTS admin_profile_id_auth_users_fkey;
    ALTER TABLE public.admin_profile
      ADD CONSTRAINT admin_profile_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE NO ACTION;
  END IF;
END $$;
