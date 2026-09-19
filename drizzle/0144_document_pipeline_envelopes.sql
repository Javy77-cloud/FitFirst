-- Document automation loop: DocuSign envelope + signer columns on form-send jobs.
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "envelope_id" text;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "envelope_status" text;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "signer_name" text;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "signer_email" text;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "envelope_sent_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "envelope_viewed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "document_pipeline_jobs" ADD COLUMN IF NOT EXISTS "envelope_completed_at" timestamptz;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_pipeline_jobs_envelope_idx"
  ON "document_pipeline_jobs" ("tenant_id", "envelope_id");
