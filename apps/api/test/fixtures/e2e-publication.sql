-- ============================================================================
-- SOLO PARA PRUEBAS LOCALES / E2E. NUNCA EJECUTAR EN PRODUCCIÓN.
-- Crea un administrador de prueba y una publicación con DATOS DE PRUEBA:
--   * base ficticia en Punta del Este (la real es P-2)
--   * un único perfil (CASA_PREMIUM nivel 3) con los valores de la fila
--     "Casa San Rafael" de la planilla, usados solo como dato de prueba (P-5)
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-000000000001', 'e2e@test.local')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

INSERT INTO public.admin_profile (id, email, full_name)
VALUES ('00000000-0000-4000-8000-000000000001', 'e2e@test.local', 'Admin E2E')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.publication (id, snapshot, published_by)
VALUES (gen_random_uuid(), '{
  "pricing": {
    "travel": { "baseLabel": "Base de prueba (Punta del Este)", "baseLat": -34.9606, "baseLng": -54.9489,
                "freeRadiusKm": "0", "routeFactor": "1.3", "costPerKm": "0.35", "mode": "POR_KM" },
    "profiles": [{ "propertyTypeCode": "CASA_PREMIUM", "serviceLevel": 3,
                   "visitsPerMonth": "4", "hoursPerVisit": "2", "travelHours": "1", "adminHours": "5",
                   "coordHours": "4", "staffHours": "2", "hourlyRate": "35", "fixedCosts": "90",
                   "premiumPct": "0.2", "highCoef": "2", "highMonths": "2.5" }],
    "params": { "TERRITORY_TOLERANCE_KM": "2" }
  }
}'::jsonb, '00000000-0000-4000-8000-000000000001');
