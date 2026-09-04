ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "lost_reason" text;
ALTER TABLE "quote_attempt_logs" ADD COLUMN IF NOT EXISTS "lost_reason" text;
