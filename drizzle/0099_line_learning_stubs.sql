-- sep7az follow-up: Flood / WC / GL learning snapshot stubs on quote_attempt_logs.
-- Beginnings only — empty UI + write hooks; future quotes fill them. Additive, no wipe.
--> statement-breakpoint
ALTER TABLE "quote_attempt_logs"
  ADD COLUMN IF NOT EXISTS "flood_feature_snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "quote_attempt_logs"
  ADD COLUMN IF NOT EXISTS "wc_feature_snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "quote_attempt_logs"
  ADD COLUMN IF NOT EXISTS "gl_feature_snapshot" jsonb;
