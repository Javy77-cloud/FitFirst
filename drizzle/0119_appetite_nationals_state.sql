-- Nationals + per-state overlays + state-keyed quote-gate learning.
-- Additive. Does not drop FL specialty carrier_appetite rows.
-- Citizens is a normal catalog row (nationals CSV) — no last-resort ranking column.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_state_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" text NOT NULL,
  "state" text NOT NULL,
  "lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cat_posture" text,
  "hard_declines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "soft_cautions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preferred_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "research_dated" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appetite_state_rules_tenant_carrier_state_uidx"
  ON "appetite_state_rules" ("tenant_id", "carrier_id", "state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_state_rules_state_idx"
  ON "appetite_state_rules" ("tenant_id", "state");
--> statement-breakpoint
ALTER TABLE "appetite_quote_decisions" ADD COLUMN IF NOT EXISTS "risk_state" text;
--> statement-breakpoint
ALTER TABLE "appetite_quote_decisions" ADD COLUMN IF NOT EXISTS "risk_line" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_quote_decisions_tenant_state_carrier_idx"
  ON "appetite_quote_decisions" ("tenant_id", "risk_state", "carrier_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_quote_decisions_state_carrier_idx"
  ON "appetite_quote_decisions" ("risk_state", "carrier_id", "created_at");
--> statement-breakpoint
ALTER TABLE "appetite_shadow_predictions" ADD COLUMN IF NOT EXISTS "risk_state" text;
--> statement-breakpoint
ALTER TABLE "appetite_shadow_predictions" ADD COLUMN IF NOT EXISTS "risk_line" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_shadow_predictions_state_carrier_idx"
  ON "appetite_shadow_predictions" ("tenant_id", "risk_state", "carrier_id");
