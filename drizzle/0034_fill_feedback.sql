CREATE TABLE IF NOT EXISTS "fill_feedback_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "document_id" uuid REFERENCES "documents"("id"),
  "quote_sheet_id" uuid REFERENCES "quote_sheets"("id"),
  "doc_type" text NOT NULL,
  "field_key" text NOT NULL,
  "wrong_value" text NOT NULL,
  "corrected_value" text NOT NULL,
  "carrier_id" uuid REFERENCES "carriers"("id"),
  "reason" text NOT NULL DEFAULT 'agent_edit',
  "line" text,
  "created_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fill_feedback_tenant_idx" ON "fill_feedback_logs" ("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "fill_feedback_lookup_idx" ON "fill_feedback_logs" ("tenant_id", "doc_type", "field_key");
