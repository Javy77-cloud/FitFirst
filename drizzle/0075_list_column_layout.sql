-- sep6p: per-user column widths + sort on the shared list table (same desk_column_prefs row).
ALTER TABLE "desk_column_prefs" ADD COLUMN IF NOT EXISTS "widths" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "desk_column_prefs" ADD COLUMN IF NOT EXISTS "sort" jsonb;
