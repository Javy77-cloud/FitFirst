-- Append-only audit for fillPolicyFromDec (issue + Documents re-fill).
-- Immutable in the app: insert only. No updated_at column.
-- Query by policy id or policy number. Does not touch quote_sheets.
CREATE TABLE IF NOT EXISTS "policy_fill_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid NOT NULL REFERENCES "policies"("id") ON DELETE CASCADE,
  "policy_number" text NOT NULL,
  "source" text NOT NULL,
  "agent_id" uuid REFERENCES "users"("id"),
  "agent_name" text NOT NULL,
  "reason" text,
  "document_id" uuid,
  "document_filename" text,
  "fields_written" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "fields_overwritten" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "policy_fill_audit_source_chk" CHECK ("source" IN ('issue', 'manual'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_fill_audit_policy_idx"
  ON "policy_fill_audit" ("tenant_id", "policy_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_fill_audit_number_idx"
  ON "policy_fill_audit" ("tenant_id", "policy_number");
