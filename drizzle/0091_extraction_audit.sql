-- sep7cg: extraction audit + synonym candidates (Why drawer evidence).
-- Additive only. Does not wipe or reseed the Zoho book. No db:seed.
-- Never mutates SYNONYM_DICTIONARY at runtime.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "deal_id" uuid NOT NULL REFERENCES "deals"("id"),
  "document_id" uuid REFERENCES "documents"("id"),
  "quote_sheet_id" uuid REFERENCES "quote_sheets"("id"),
  "shop_line" text NOT NULL DEFAULT 'home',
  "doc_type" text NOT NULL DEFAULT '',
  "doc_type_inferred" boolean DEFAULT false NOT NULL,
  "engine" text NOT NULL,
  "document_quality" text,
  "quality_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz,
  "status" text NOT NULL,
  "message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_attempts_deal_idx"
  ON "extraction_attempts" ("tenant_id", "deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_attempts_doc_idx"
  ON "extraction_attempts" ("tenant_id", "document_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_field_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "attempt_id" uuid NOT NULL REFERENCES "extraction_attempts"("id") ON DELETE cascade,
  "field_key" text NOT NULL,
  "match_path" text NOT NULL DEFAULT 'none',
  "matched_synonym" text,
  "source_line" text,
  "source_line_no" integer,
  "raw_value" text DEFAULT '' NOT NULL,
  "normalized_value" text DEFAULT '' NOT NULL,
  "confidence" numeric(4, 3),
  "flagged" boolean DEFAULT false NOT NULL,
  "blank_after_match" boolean DEFAULT false NOT NULL,
  "miss_reason" text,
  "applied_to_sheet" boolean DEFAULT false NOT NULL,
  "sheet_key" text,
  "sheet_source_label" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_field_attempts_attempt_idx"
  ON "extraction_field_attempts" ("tenant_id", "attempt_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_field_attempts_field_idx"
  ON "extraction_field_attempts" ("tenant_id", "field_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "field_attempt_id" uuid REFERENCES "extraction_field_attempts"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "document_id" uuid REFERENCES "documents"("id"),
  "doc_type" text NOT NULL DEFAULT 'dec',
  "field_key" text NOT NULL,
  "shop_line" text NOT NULL DEFAULT 'home',
  "extracted_value" text DEFAULT '' NOT NULL,
  "corrected_value" text NOT NULL,
  "reason" text NOT NULL DEFAULT 'agent_edit',
  "corrected_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "apply_on_next_fill" boolean DEFAULT true NOT NULL,
  "locked" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_corrections_lookup_idx"
  ON "extraction_corrections" ("tenant_id", "doc_type", "field_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_corrections_deal_idx"
  ON "extraction_corrections" ("tenant_id", "deal_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "synonym_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "field_key" text NOT NULL,
  "proposed_synonym" text NOT NULL,
  "evidence_correction_id" uuid REFERENCES "extraction_corrections"("id"),
  "evidence_attempt_id" uuid REFERENCES "extraction_attempts"("id"),
  "times_seen" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'proposed' NOT NULL,
  "approved_by" text,
  "approved_at" timestamptz,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "synonym_candidates_field_syn_uidx"
  ON "synonym_candidates" ("tenant_id", "field_key", "proposed_synonym");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "synonym_candidates_queue_idx"
  ON "synonym_candidates" ("tenant_id", "status", "times_seen");
