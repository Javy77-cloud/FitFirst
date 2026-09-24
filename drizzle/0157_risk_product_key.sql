-- Per-product property. One deal can hold two HO3s (or HO3 + DP3) that are
-- different buildings. product_key is the shop product instance
-- (`homeowners`, `landlord`, `homeowners~88uvyj`). A later vehicle on an
-- auto product uses `auto#v2`.
-- Null keeps the original row: the app attaches that row to the first
-- property product on the deal (or the first auto product when the deal
-- has no property). Do not backfill a guessed product. Do not delete rows.
-- DO NOT APPLY until the owner approves. Additive and backward compatible.
-- The app reads and writes this column only when it already exists.
ALTER TABLE "risks" ADD COLUMN IF NOT EXISTS "product_key" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risks_deal_product_key_idx" ON "risks" ("tenant_id", "deal_id", "product_key");
