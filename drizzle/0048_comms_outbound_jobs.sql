CREATE TABLE IF NOT EXISTS "comms_outbound_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "channel" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "to_address" text,
  "from_address" text,
  "subject" text,
  "body" text,
  "contact_id" uuid,
  "account_id" uuid,
  "deal_id" uuid,
  "policy_id" uuid,
  "lead_id" uuid,
  "activity_id" uuid,
  "hold_reason" text,
  "vendor" text,
  "scheduled_for" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "comms_outbound_tenant_idx"
  ON "comms_outbound_jobs" ("tenant_id", "status", "channel");
