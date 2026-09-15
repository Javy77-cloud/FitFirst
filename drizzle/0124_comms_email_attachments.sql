-- Persist selected quote PDFs on outbound deal email jobs.
ALTER TABLE "comms_outbound_jobs"
  ADD COLUMN IF NOT EXISTS "attachment_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
