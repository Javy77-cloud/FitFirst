-- Agency-configurable page filters (contacts / businesses / policies / carriers). Additive only.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_page_filter_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "module" text NOT NULL,
  "filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agency_page_filter_prefs" ADD CONSTRAINT "agency_page_filter_prefs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_page_filter_prefs_uidx" ON "agency_page_filter_prefs" USING btree ("tenant_id","module");
