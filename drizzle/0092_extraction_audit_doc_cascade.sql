-- sep7cg: cascade / null extraction audit FKs so document delete succeeds.
-- Additive only. Does not wipe or reseed.
-- attempts (+ field_attempts via attempt cascade) die with the document.
-- corrections die with the document (learning retained in fill_learning_logs).
-- synonym_candidates keep proposals; evidence refs nulled.
-- Note: corrections.document_id must CASCADE (not SET NULL) so Postgres does not
-- re-check field_attempt_id after field_attempts are already cascade-deleted.
--> statement-breakpoint
ALTER TABLE "extraction_attempts" DROP CONSTRAINT IF EXISTS "extraction_attempts_document_id_fkey";
--> statement-breakpoint
ALTER TABLE "extraction_attempts"
  ADD CONSTRAINT "extraction_attempts_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "extraction_corrections" DROP CONSTRAINT IF EXISTS "extraction_corrections_document_id_fkey";
--> statement-breakpoint
ALTER TABLE "extraction_corrections"
  ADD CONSTRAINT "extraction_corrections_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "extraction_corrections" DROP CONSTRAINT IF EXISTS "extraction_corrections_field_attempt_id_fkey";
--> statement-breakpoint
ALTER TABLE "extraction_corrections"
  ADD CONSTRAINT "extraction_corrections_field_attempt_id_fkey"
  FOREIGN KEY ("field_attempt_id") REFERENCES "extraction_field_attempts"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "synonym_candidates" DROP CONSTRAINT IF EXISTS "synonym_candidates_evidence_attempt_id_fkey";
--> statement-breakpoint
ALTER TABLE "synonym_candidates"
  ADD CONSTRAINT "synonym_candidates_evidence_attempt_id_fkey"
  FOREIGN KEY ("evidence_attempt_id") REFERENCES "extraction_attempts"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "synonym_candidates" DROP CONSTRAINT IF EXISTS "synonym_candidates_evidence_correction_id_fkey";
--> statement-breakpoint
ALTER TABLE "synonym_candidates"
  ADD CONSTRAINT "synonym_candidates_evidence_correction_id_fkey"
  FOREIGN KEY ("evidence_correction_id") REFERENCES "extraction_corrections"("id") ON DELETE set null;
