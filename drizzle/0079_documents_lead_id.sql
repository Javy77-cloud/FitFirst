-- sep6x: keyed attachment so a file belongs to a lead + line, never the lead as a blob.
-- Additive nullable lead_id only. Line is stored on existing documents.tags (`line:home`).
-- Numbered 0079 because sep6w already shipped 0078_default_first_step_popup.
-- Does not wipe or reseed the Zoho book. No db:seed.
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "lead_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_lead_id_leads_id_fk'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_lead_id_leads_id_fk"
      FOREIGN KEY ("lead_id") REFERENCES "leads"("id");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_tenant_lead_idx" ON "documents" ("tenant_id", "lead_id");
