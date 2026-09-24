-- Per-product property. One deal can hold two HO3s (or HO3 + DP3) that are
-- different buildings. product_key is the shop product instance
-- (`homeowners`, `landlord`, `homeowners~88uvyj`).
-- Null keeps the original row: the app attaches that row to the first
-- property product on the deal. Do not backfill a guessed product.
-- Apply on Neon before deploy. Idempotent. Does not seed or delete rows.
ALTER TABLE "risks" ADD COLUMN IF NOT EXISTS "product_key" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risks_deal_product_key_idx" ON "risks" ("tenant_id", "deal_id", "product_key");
