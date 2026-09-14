-- Carrier Appetite v1: slug-keyed FL specialty catalog + quote-gate decision log.
-- Additive only. Does not merge into UUID `carriers` (Carriers UI unchanged).
-- NEVER merge universal_pc (Universal Property & Casualty) with uicna (UICNA).
-- Legacy appetite_rules = Markets matcher. appetite_engine_* = shadow learning (out of scope).
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_appetite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" text NOT NULL,
  "legal_name" text NOT NULL,
  "segment" text NOT NULL,
  "lines_offered" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "lines_not_offered" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "states_available" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "states_restricted" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "states_raw" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "portal_name" text,
  "cs_phone" text,
  "claims_phone" text,
  "rateable" boolean DEFAULT true NOT NULL,
  "hard_declines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "soft_cautions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preferred_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cat_posture" text NOT NULL DEFAULT 'selective',
  "notes_for_agent" text,
  "quote_priority" integer,
  "fl_ho_order" integer,
  "needs_state_confirm" boolean DEFAULT false NOT NULL,
  "linked_carrier_id" uuid REFERENCES "carriers"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_appetite_tenant_slug_uidx"
  ON "carrier_appetite" ("tenant_id", "carrier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_appetite_tenant_rateable_idx"
  ON "carrier_appetite" ("tenant_id", "rateable");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_quote_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" text NOT NULL,
  "deal_id" uuid REFERENCES "deals"("id"),
  "risk_id" uuid REFERENCES "risks"("id"),
  "master_id" uuid,
  "status" text NOT NULL,
  "matching_rule" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_quote_decisions_deal_idx"
  ON "appetite_quote_decisions" ("tenant_id", "deal_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appetite_quote_decisions_carrier_idx"
  ON "appetite_quote_decisions" ("tenant_id", "carrier_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetite_gate_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "fl_ho_order" jsonb,
  -- citizens_within_pct: deprecated stub from v1. Quote-gate no longer reads it (Citizens is not last-resort). Do not DROP if Neon already has rows.
  "citizens_within_pct" real NOT NULL DEFAULT 20,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appetite_gate_prefs_tenant_uidx"
  ON "appetite_gate_prefs" ("tenant_id");
