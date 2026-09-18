-- HealthSherpa inbound contact-match safety.
-- Weak / unmatched enrollments stay on the row instead of silently creating a contact.
--> statement-breakpoint
ALTER TABLE "healthsherpa_enrollments"
  ADD COLUMN IF NOT EXISTS "match_status" text DEFAULT 'linked' NOT NULL;
--> statement-breakpoint
ALTER TABLE "healthsherpa_enrollments"
  ADD COLUMN IF NOT EXISTS "match_reason" text;
--> statement-breakpoint
ALTER TABLE "healthsherpa_enrollments"
  ADD COLUMN IF NOT EXISTS "candidate_contact_id" uuid;
--> statement-breakpoint
ALTER TABLE "healthsherpa_enrollments"
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;
--> statement-breakpoint
UPDATE "healthsherpa_enrollments"
  SET "match_status" = 'unmatched'
  WHERE "contact_id" IS NULL AND "match_status" = 'linked';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "healthsherpa_enrollments_match_idx"
  ON "healthsherpa_enrollments" ("tenant_id", "match_status");
