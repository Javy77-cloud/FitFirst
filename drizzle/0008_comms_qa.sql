ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "outcome" text;
