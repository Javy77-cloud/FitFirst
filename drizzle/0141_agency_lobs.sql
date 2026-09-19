-- Agency master Lines of Business. Every deal, policy, and form picks from this list.
CREATE TABLE IF NOT EXISTS "agency_lobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "product_id" text NOT NULL,
  "label" text NOT NULL,
  "lob_code" text NOT NULL,
  "family" text NOT NULL,
  "sheet_product" text NOT NULL,
  "quoting_form" text,
  "active" boolean DEFAULT true NOT NULL,
  "built_in" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_lobs_tenant_idx" ON "agency_lobs" ("tenant_id", "active", "sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_lobs_product_uidx" ON "agency_lobs" ("tenant_id", "product_id");
