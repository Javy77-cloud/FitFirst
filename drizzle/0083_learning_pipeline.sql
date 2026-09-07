-- sep7av / sep7az: three-layer learning pipeline (raw tenant / anonymize / global pool).
-- Renumbered from 0081 to keep 0081_deal_field_builder and 0082_document_field_maps.
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
-- Consent default opt-out. Global pool writes stay gated until purchase.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_raw_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "source_label" text NOT NULL,
  "form_version" text NOT NULL,
  "carrier" text DEFAULT '' NOT NULL,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_raw_documents_tenant_idx" ON "learning_raw_documents" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_raw_extractions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "document_id" uuid NOT NULL,
  "field_key" text NOT NULL,
  "field_type" text NOT NULL,
  "extracted_value" text DEFAULT '' NOT NULL,
  "source_label" text NOT NULL,
  "form_version" text NOT NULL,
  "carrier" text DEFAULT '' NOT NULL,
  "extracted_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_raw_extractions_tenant_idx" ON "learning_raw_extractions" ("tenant_id", "document_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_raw_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "document_id" uuid NOT NULL,
  "extraction_id" uuid NOT NULL,
  "field_key" text NOT NULL,
  "field_type" text NOT NULL,
  "extracted_value" text DEFAULT '' NOT NULL,
  "corrected_value" text NOT NULL,
  "source_label" text NOT NULL,
  "form_version" text NOT NULL,
  "carrier" text DEFAULT '' NOT NULL,
  "corrected_by" text NOT NULL,
  "corrected_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_raw_corrections_tenant_idx" ON "learning_raw_corrections" ("tenant_id", "document_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_pool_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "agency_id" uuid NOT NULL,
  "opted_in" boolean DEFAULT false NOT NULL,
  "terms_version" text NOT NULL,
  "agreed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_pool_consents_agency_uidx" ON "learning_pool_consents" ("agency_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_global_pool" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "source_label" text NOT NULL,
  "field_type" text NOT NULL,
  "form_version" text NOT NULL,
  "carrier" text DEFAULT '' NOT NULL,
  "correction" jsonb NOT NULL,
  "received_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_global_pool_field_idx" ON "learning_global_pool" ("field_type", "form_version");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_seed_library" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "form_id" text NOT NULL,
  "form_version" text NOT NULL,
  "source_label" text NOT NULL,
  "field_type" text NOT NULL,
  "carrier" text DEFAULT '' NOT NULL,
  "mapping_from" text NOT NULL,
  "mapping_to" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_seed_library_form_idx" ON "learning_seed_library" ("form_id", "form_version");
