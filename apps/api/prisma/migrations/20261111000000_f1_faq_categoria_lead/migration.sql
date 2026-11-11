-- Etapa F1 (análisis del 11/11/2026): FAQ por categorías y datos opcionales de la consulta.
-- Solo AGREGA columnas (compatible hacia atrás: la versión anterior de la API sigue funcionando
-- con esta base, requisito de las migraciones en el build de Render, ver ADR-017/despliegue.md).

-- Categoría del acordeón de preguntas frecuentes.
ALTER TABLE "faq" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General';

-- Consulta: país de residencia y ubicación del inmueble (ambos opcionales).
ALTER TABLE "lead" ADD COLUMN "residence_country" TEXT;
ALTER TABLE "lead" ADD COLUMN "property_location" TEXT;
