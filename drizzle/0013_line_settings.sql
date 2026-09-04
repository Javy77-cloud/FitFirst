ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "write_life" boolean DEFAULT true NOT NULL;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "write_health" boolean DEFAULT true NOT NULL;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "show_selling_agency" boolean DEFAULT false NOT NULL;

ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "policy_sub_type" text;

CREATE TABLE IF NOT EXISTS "line_subfilter_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "book" text NOT NULL,
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "line_subfilter_options_tenant_idx" ON "line_subfilter_options" ("tenant_id", "book");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "line_subfilter_options_book_slug_uidx" ON "line_subfilter_options" ("tenant_id", "book", "slug");
