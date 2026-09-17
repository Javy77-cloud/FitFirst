-- Document pipeline slice 1: Agency letter jobs (Cancellation / AOR).
-- Gemini extract → agent confirm. Envelope send stays later.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_pipeline_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "deal_id" uuid NOT NULL REFERENCES "deals"("id"),
  "type" text NOT NULL,
  "status" text NOT NULL,
  "source_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "extract_payload" jsonb DEFAULT '{"fields":[],"engine":"gemini"}'::jsonb NOT NULL,
  "confirmed_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "filled_document_id" uuid,
  "form_fill_id" uuid,
  "message" text,
  "extracted_at" timestamptz,
  "confirmed_at" timestamptz,
  "filled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_pipeline_jobs_deal_idx"
  ON "document_pipeline_jobs" ("tenant_id", "deal_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_pipeline_jobs_type_idx"
  ON "document_pipeline_jobs" ("tenant_id", "deal_id", "type");
