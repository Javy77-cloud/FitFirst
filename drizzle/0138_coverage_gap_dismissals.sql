-- Agent dismissals for household coverage-gap findings.
-- Reasons stay on the household so renewals do not re-nag.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coverage_gap_dismissals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "party_kind" text NOT NULL,
  "party_id" uuid NOT NULL,
  "rule_id" text NOT NULL,
  "reason" text NOT NULL,
  "dismissed_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coverage_gap_dismissals_party_rule_uidx"
  ON "coverage_gap_dismissals" ("tenant_id", "party_kind", "party_id", "rule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coverage_gap_dismissals_party_idx"
  ON "coverage_gap_dismissals" ("tenant_id", "party_kind", "party_id");
