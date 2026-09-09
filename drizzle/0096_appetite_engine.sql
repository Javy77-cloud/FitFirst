-- sep7dl: Appetite prediction engine (shadow mode).
-- Additive only. Does not wipe Zoho book / quotes / legacy appetite_rules.
-- Legacy appetite_rules = carrier profile matcher for Markets.
-- appetite_engine_rules = Standing/Candidate field/operator rules for shadow predict.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_partitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "state" text NOT NULL,
  "line" text NOT NULL,
  "status" text NOT NULL DEFAULT 'shadow',
  "shadow_started_at" timestamptz DEFAULT now() NOT NULL,
  "graduated_at" timestamptz,
  "accuracy_pct" real,
  "scored_shops" integer NOT NULL DEFAULT 0,
  "min_sample" integer NOT NULL DEFAULT 30,
  "accuracy_threshold" real NOT NULL DEFAULT 0.90,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appetite_partitions_tenant_state_line_uidx"
  ON "appetite_partitions" ("tenant_id", "state", "line");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_partitions_tenant_status_idx"
  ON "appetite_partitions" ("tenant_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_engine_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "partition_id" uuid NOT NULL REFERENCES "appetite_partitions"("id") ON DELETE cascade,
  "layer" text NOT NULL DEFAULT 'standing',
  "field" text NOT NULL,
  "operator" text NOT NULL,
  "threshold" jsonb NOT NULL,
  "disposition" text NOT NULL,
  "reason_code" text NOT NULL DEFAULT 'other',
  "carrier_id" uuid REFERENCES "carriers"("id"),
  "confidence_count" integer NOT NULL DEFAULT 0,
  "live" boolean NOT NULL DEFAULT true,
  "source" text NOT NULL DEFAULT 'seed',
  "stale" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_engine_rules_partition_idx"
  ON "appetite_engine_rules" ("tenant_id", "partition_id", "layer");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_engine_rules_carrier_idx"
  ON "appetite_engine_rules" ("tenant_id", "carrier_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_shadow_predictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "partition_id" uuid NOT NULL REFERENCES "appetite_partitions"("id") ON DELETE cascade,
  "deal_id" uuid REFERENCES "deals"("id"),
  "risk_id" uuid REFERENCES "risks"("id"),
  "carrier_id" uuid REFERENCES "carriers"("id"),
  "attempt_id" uuid REFERENCES "quote_attempt_logs"("id"),
  "predicted" text NOT NULL,
  "triggering_rule_id" uuid REFERENCES "appetite_engine_rules"("id"),
  "reason_code" text,
  "actual_disposition" text,
  "scored" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_shadow_predictions_partition_idx"
  ON "appetite_shadow_predictions" ("tenant_id", "partition_id", "scored");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_shadow_predictions_attempt_idx"
  ON "appetite_shadow_predictions" ("tenant_id", "attempt_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_edge_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "partition_id" uuid NOT NULL REFERENCES "appetite_partitions"("id") ON DELETE cascade,
  "prediction_id" uuid REFERENCES "appetite_shadow_predictions"("id"),
  "note" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_edge_cases_partition_idx"
  ON "appetite_edge_cases" ("tenant_id", "partition_id", "status");
