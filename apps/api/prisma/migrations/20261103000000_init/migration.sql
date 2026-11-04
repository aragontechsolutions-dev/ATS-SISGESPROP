-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "MediaVariant" AS ENUM ('DESKTOP', 'MOBILE', 'GENERAL');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('POR_KM', 'POR_TRAMOS');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVA', 'CONTACTADA', 'CERRADA');

-- CreateTable
CREATE TABLE "admin_profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_block" (
    "id" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_level" (
    "id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "included_items" JSONB NOT NULL,
    "image_id" UUID,

    CONSTRAINT "service_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonial" (
    "id" UUID NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorized_at" DATE NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "variant" "MediaVariant" NOT NULL DEFAULT 'GENERAL',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication" (
    "id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "published_by" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploy_id" TEXT,

    CONSTRAINT "publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "property_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_profile" (
    "id" UUID NOT NULL,
    "property_type_id" UUID NOT NULL,
    "service_level" INTEGER NOT NULL,
    "visits_per_month" DECIMAL(6,2) NOT NULL,
    "hours_per_visit" DECIMAL(6,2) NOT NULL,
    "travel_hours" DECIMAL(6,2) NOT NULL,
    "admin_hours" DECIMAL(6,2) NOT NULL,
    "coord_hours" DECIMAL(6,2) NOT NULL,
    "staff_hours" DECIMAL(6,2) NOT NULL,
    "hourly_rate" DECIMAL(12,2) NOT NULL,
    "fixed_costs" DECIMAL(12,2) NOT NULL,
    "premium_pct" DECIMAL(6,4) NOT NULL,
    "high_coef" DECIMAL(6,3) NOT NULL,
    "high_months" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "calc_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_param" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "valid_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_param_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_config" (
    "id" UUID NOT NULL,
    "base_label" TEXT NOT NULL,
    "base_lat" DECIMAL(9,6) NOT NULL,
    "base_lng" DECIMAL(9,6) NOT NULL,
    "free_radius_km" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "route_factor" DECIMAL(4,2) NOT NULL DEFAULT 1.3,
    "cost_per_km" DECIMAL(8,4) NOT NULL DEFAULT 0.35,
    "mode" "TravelMode" NOT NULL DEFAULT 'POR_KM',

    CONSTRAINT "travel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_tier" (
    "id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "from_km" DECIMAL(8,2) NOT NULL,
    "to_km" DECIMAL(8,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "travel_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locality" (
    "id" UUID NOT NULL,
    "department" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "locality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation" (
    "id" UUID NOT NULL,
    "property_type_id" UUID NOT NULL,
    "service_level" INTEGER NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "distance_km" DECIMAL(8,2) NOT NULL,
    "billable_km" DECIMAL(8,2) NOT NULL,
    "low_fee" DECIMAL(14,2) NOT NULL,
    "high_fee" DECIMAL(14,2) NOT NULL,
    "annual_fee" DECIMAL(14,2) NOT NULL,
    "inputs_snapshot" JSONB NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "property_type_id" UUID,
    "simulation_id" UUID,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NUEVA',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "policy_version" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT NOT NULL,

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_profile_email_key" ON "admin_profile"("email");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_block_section_key_key" ON "content_block"("section", "key");

-- CreateIndex
CREATE UNIQUE INDEX "service_level_level_key" ON "service_level"("level");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_storage_path_key" ON "media_asset"("storage_path");

-- CreateIndex
CREATE INDEX "publication_published_at_idx" ON "publication"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "property_type_code_key" ON "property_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "calc_profile_property_type_id_service_level_key" ON "calc_profile"("property_type_id", "service_level");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_param_key_key" ON "pricing_param"("key");

-- CreateIndex
CREATE UNIQUE INDEX "locality_department_name_key" ON "locality"("department", "name");

-- CreateIndex
CREATE INDEX "simulation_created_at_idx" ON "simulation"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_simulation_id_key" ON "lead"("simulation_id");

-- CreateIndex
CREATE INDEX "lead_status_created_at_idx" ON "lead"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "consent_record_lead_id_key" ON "consent_record"("lead_id");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_block" ADD CONSTRAINT "content_block_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_level" ADD CONSTRAINT "service_level_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "admin_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication" ADD CONSTRAINT "publication_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "admin_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_profile" ADD CONSTRAINT "calc_profile_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_tier" ADD CONSTRAINT "travel_tier_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "travel_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation" ADD CONSTRAINT "simulation_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

