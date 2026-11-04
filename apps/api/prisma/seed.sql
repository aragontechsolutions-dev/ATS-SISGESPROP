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

-- ----------------------------------------------------------------------------
-- Contenido PROVISORIO de la landing (Bloque D): punto de partida editable desde
-- el panel. Textos del Documento Maestro; nombre PRIVAT confirmado por el cliente.
-- ON CONFLICT DO NOTHING: nunca pisa lo que el administrador ya editó.
-- Datos de contacto, legales, FAQ y testimonios quedan vacíos (no se inventan).
-- ----------------------------------------------------------------------------
INSERT INTO public.content_block (id, section, key, value, updated_at) VALUES
  (gen_random_uuid(), 'settings', 'main', '{"provisional": true, "clientAccess": "proximamente", "privacyPolicyVersion": "provisoria-0"}'::jsonb, now()),
  (gen_random_uuid(), 'brand', 'main', '{"name": "PRIVAT"}'::jsonb, now()),
  (gen_random_uuid(), 'seo', 'main', '{"title": "Property Management técnico en Maldonado, Punta del Este y Rocha", "description": "Administración patrimonial transparente con supervisión de arquitectos: cuentas separadas, fondo rotativo, informes mensuales y mantenimiento preventivo."}'::jsonb, now()),
  (gen_random_uuid(), 'nav', 'main', '{"items": [{"label": "Servicios", "href": "#servicios"}, {"label": "Transparencia", "href": "#transparencia"}, {"label": "Cobertura", "href": "#cobertura"}, {"label": "Cotizador", "href": "#cotizador"}, {"label": "Contacto", "href": "#contacto"}]}'::jsonb, now()),
  (gen_random_uuid(), 'hero', 'main', '{"title": "Gestión patrimonial inteligente y rigor técnico para tu propiedad en el Este", "subtitle": "Olvídate de la operativa diaria. Combinamos administración contable transparente, control de proveedores y supervisión de arquitectura en Maldonado, Punta del Este y Rocha.", "cta": "Solicitar diagnóstico", "badges": ["Supervisión directa por arquitectos", "Cuentas bancarias separadas y fondo rotativo"]}'::jsonb, now()),
  (gen_random_uuid(), 'services', 'main', '{"eyebrow": "Servicios", "title": "Tres niveles de servicio, según lo que necesita tu propiedad", "intro": "No solo pagamos facturas: auditamos, planificamos el mantenimiento y te rendimos cuentas con fotos y números."}'::jsonb, now()),
  (gen_random_uuid(), 'transparency', 'main', '{"eyebrow": "Cómo trabajamos", "title": "Transparencia operativa", "items": [{"title": "Cuentas claras", "text": "Operamos con cuentas bancarias separadas y un fondo rotativo con reposición mensual. Tu dinero nunca se mezcla con el de la empresa."}, {"title": "Límites de gasto", "text": "Política clara por escrito: definimos contigo el monto que podemos gastar sin consulta previa. Por encima de ese límite, siempre pedimos tu aprobación."}, {"title": "Informe mensual", "text": "Cada mes recibes el reporte fotográfico de la propiedad, el estado financiero y la evolución de consumos para detectar pérdidas o consumos anómalos."}]}'::jsonb, now()),
  (gen_random_uuid(), 'coverage', 'main', '{"eyebrow": "Cobertura", "title": "Trabajamos en todo Uruguay", "text": "Toca el mapa donde está tu propiedad y te mostramos la distancia aproximada desde nuestra base y el viático de traslado.", "viaticoNote": "La distancia es una estimación: línea recta corregida por un factor de ruta. El valor definitivo se confirma en la auditoría inicial."}'::jsonb, now()),
  (gen_random_uuid(), 'quoter', 'main', '{"eyebrow": "Cotizador", "title": "Conoce una estimación de tu abono", "intro": "Tres pasos: tipo de propiedad, nivel de servicio y ubicación.", "disclaimer": "Estimación orientativa sujeta a auditoría inicial.", "cta": "Congela esta tarifa programando una auditoría inicial"}'::jsonb, now()),
  (gen_random_uuid(), 'contact', 'main', '{"eyebrow": "Contacto", "title": "Solicita un diagnóstico inicial", "text": "Cuéntanos sobre tu propiedad y te contactamos para coordinar la auditoría.", "phone": null, "whatsapp": null, "email": null, "address": null}'::jsonb, now()),
  (gen_random_uuid(), 'footer', 'main', '{"legal": null, "privacyPolicyUrl": null, "termsUrl": null}'::jsonb, now())
ON CONFLICT (section, key) DO NOTHING;
