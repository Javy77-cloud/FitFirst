ALTER TABLE "user_dashboard_prefs"
  ADD COLUMN IF NOT EXISTS "custom_layouts" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "user_dashboard_prefs"
  ADD COLUMN IF NOT EXISTS "active_layout_id" text;
--> statement-breakpoint
ALTER TABLE "user_dashboard_prefs"
  ADD COLUMN IF NOT EXISTS "resize_tiles" boolean NOT NULL DEFAULT false;
