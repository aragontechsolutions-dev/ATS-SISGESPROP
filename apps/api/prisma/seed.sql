-- ============================================================================
-- Datos iniciales (idempotente: se puede ejecutar varias veces).
-- SOLO datos confirmados en los documentos del cliente:
--   * Tipos de propiedad: hoja TARIFARIO de Estructura_Cobro_Admin_Propiedades.xlsx
--   * Niveles de servicio: Documento Maestro (sección 3.C)
--   * TERRITORY_TOLERANCE_KM: valor técnico (ver docs/adr/ADR-006)
-- NO se cargan (pendientes del cliente, el cotizador responde "no configurado"):
--   * Base de operaciones / reglas de viático (P-2, P-3)
--   * Los 15 perfiles de cálculo (P-5)
--   * Localidades (fuente oficial a definir)
-- Ejecutar: npx prisma db execute --file prisma/seed.sql  (con DIRECT_URL)
-- ============================================================================

INSERT INTO public.property_type (id, code, name, sort_order) VALUES
  (gen_random_uuid(), 'APTO_TORRE',        'Apartamento en torre',                  1),
  (gen_random_uuid(), 'CASA_150_300',      'Casa 150-300 m² con piscina',           2),
  (gen_random_uuid(), 'CASA_PREMIUM',      'Casa premium 400-700 m²',               3),
  (gen_random_uuid(), 'MANSION_CHACRA',    'Mansión o chacra con personal',         4),
  (gen_random_uuid(), 'CHACRA_PRODUCTIVA', 'Chacra productiva o múltiples padrones', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.service_level (id, level, name, description, included_items) VALUES
  (gen_random_uuid(), 1, 'Cuidador / Control periódico',
   'Rondas de inspección, control post-temporada, custodia de llaves y aviso inmediato. Ideal para casas cerradas.',
   '["Rondas de inspección","Control post-temporada","Custodia de llaves","Aviso inmediato"]'::jsonb),
  (gen_random_uuid(), 2, 'Administración integral',
   'Pago puntual de servicios (UTE, OSE, Contribución Inmobiliaria, Impuesto de Primaria), gestión de personal en BPS y rendición de cuentas mensual.',
   '["Pago de UTE, OSE, Contribución Inmobiliaria e Impuesto de Primaria","Gestión de personal en BPS","Rendición de cuentas mensual"]'::jsonb),
  (gen_random_uuid(), 3, 'Property Management técnico',
   'Todo lo anterior más relevamiento inicial de patologías, plan de mantenimiento preventivo a 24 meses, presupuesto anual proyectado y dirección de obras menores o reformas.',
   '["Todo lo del nivel 2","Relevamiento inicial de patologías","Plan de mantenimiento preventivo a 24 meses","Presupuesto anual proyectado","Dirección de obras menores o reformas"]'::jsonb)
ON CONFLICT (level) DO NOTHING;

INSERT INTO public.pricing_param (id, key, value) VALUES
  (gen_random_uuid(), 'TERRITORY_TOLERANCE_KM', 2)
ON CONFLICT (key) DO NOTHING;
