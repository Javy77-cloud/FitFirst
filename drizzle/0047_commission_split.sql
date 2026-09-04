ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "producer_amount" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "paid_by_user_id" uuid;
