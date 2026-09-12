-- Carriers: structured Appetite / Don't Write rows (searchable). Additive only.
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "appetite_rows" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "dont_write_rows" jsonb DEFAULT '[]'::jsonb NOT NULL;
