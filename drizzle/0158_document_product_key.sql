-- Optional product scope on documents. Files are already isolated with
-- `instance:` tags, so the app does not require this column.
-- Null keeps an existing file on the deal. Do not backfill. Do not delete.
-- DO NOT APPLY until the owner approves. Additive and backward compatible.
-- The Drizzle schema does not select this column, so document queries keep
-- working before and after it exists.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "product_key" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_deal_product_key_idx" ON "documents" ("tenant_id", "deal_id", "product_key");
