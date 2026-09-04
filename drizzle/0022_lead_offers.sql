CREATE TABLE IF NOT EXISTS "lead_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" text NOT NULL,
  "details" text NOT NULL,
  "language" text,
  "state" text,
  "lead_id" uuid,
  "posted_by" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "awarded_to" uuid,
  "awarded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lead_offers_tenant_idx" ON "lead_offers" ("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "lead_offer_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "offer_id" uuid NOT NULL REFERENCES "lead_offers"("id"),
  "agent_id" uuid NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_offer_claims_agent_uidx"
  ON "lead_offer_claims" ("tenant_id", "offer_id", "agent_id");
