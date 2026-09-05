ALTER TABLE "user_dashboard_prefs"
  ADD COLUMN IF NOT EXISTS "custom_layouts" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_dashboard_prefs" DROP CONSTRAINT IF EXISTS "user_dashboard_prefs_active_layout_id_fk";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "user_dashboard_prefs"
  ALTER COLUMN "active_layout_id" TYPE text USING "active_layout_id"::text;
