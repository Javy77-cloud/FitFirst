ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "allow_agents_monitor_gbp" boolean DEFAULT false NOT NULL;
