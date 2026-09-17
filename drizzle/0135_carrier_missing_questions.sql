-- Living gap list: carrier/quote-bot questions FitFirst has no field for.
-- Empty by default. Do not seed example carriers. Additive only.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_missing_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "product_line" text NOT NULL,
  "carrier" text,
  "suggested_surface" text DEFAULT 'details' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "note" text NOT NULL,
  "source_quote_note_id" uuid,
  "created_by" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_missing_questions_tenant_status_idx"
  ON "carrier_missing_questions" ("tenant_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_missing_questions_source_note_uidx"
  ON "carrier_missing_questions" ("tenant_id", "source_quote_note_id")
  WHERE "source_quote_note_id" IS NOT NULL;
