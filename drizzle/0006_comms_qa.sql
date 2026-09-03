ALTER TABLE "record_asks" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "outcome" text;
