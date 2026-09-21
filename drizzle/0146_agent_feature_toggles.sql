-- Agency → agent feature toggles (People & access). JSON prefs, same pattern as agent_policy_access.
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "agent_feature_toggles" jsonb;
