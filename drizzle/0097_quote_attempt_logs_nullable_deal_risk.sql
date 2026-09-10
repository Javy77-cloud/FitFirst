ALTER TABLE "quote_attempt_logs" ALTER COLUMN "deal_id" DROP NOT NULL;
ALTER TABLE "quote_attempt_logs" ALTER COLUMN "risk_id" DROP NOT NULL;
ALTER TABLE "appetite_shadow_predictions" ALTER COLUMN "deal_id" DROP NOT NULL;
ALTER TABLE "appetite_shadow_predictions" ALTER COLUMN "risk_id" DROP NOT NULL;
