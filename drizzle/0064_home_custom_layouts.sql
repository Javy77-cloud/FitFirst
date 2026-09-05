ALTER TABLE "user_dashboard_prefs"
  ADD COLUMN IF NOT EXISTS "active_layout_id" uuid,
  ADD COLUMN IF NOT EXISTS "resize_tiles" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_home_layouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "placements" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "hidden_widgets" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_home_layouts_user_idx"
  ON "user_home_layouts" ("tenant_id", "user_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_home_layouts" ADD CONSTRAINT "user_home_layouts_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_dashboard_prefs" ADD CONSTRAINT "user_dashboard_prefs_active_layout_id_fk"
  FOREIGN KEY ("active_layout_id") REFERENCES "public"."user_home_layouts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
