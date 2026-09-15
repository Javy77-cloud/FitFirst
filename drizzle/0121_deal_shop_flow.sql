ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "shop_flow" jsonb;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "quote_run_id" uuid;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "shop_line" text;
