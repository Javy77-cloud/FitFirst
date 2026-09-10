-- sep7az: Auto premium-learning snapshot on quote_attempt_logs (parallel to Home appetite snaps).
-- Additive only. Site-dev datasheet ranks carriers by historical premium for similar Auto risks.
--> statement-breakpoint
ALTER TABLE "quote_attempt_logs"
  ADD COLUMN IF NOT EXISTS "auto_feature_snapshot" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_logs_auto_snap_idx"
  ON "quote_attempt_logs" ("tenant_id", "line_of_business")
  WHERE "auto_feature_snapshot" IS NOT NULL;
