-- sep7df: rename Quotes-tab risk_outcome labels + optional carrier open URL.
-- Additive / data rename only. Does not wipe or reseed. No Policies.
-- risk_outcome: bindable | conditional | declined | no_market
-- (was accepted | maybe | not_accepted | no_option)
--> statement-breakpoint
UPDATE "quotes" SET "risk_outcome" = 'bindable' WHERE "risk_outcome" = 'accepted';
--> statement-breakpoint
UPDATE "quotes" SET "risk_outcome" = 'conditional' WHERE "risk_outcome" = 'maybe';
--> statement-breakpoint
UPDATE "quotes" SET "risk_outcome" = 'declined' WHERE "risk_outcome" = 'not_accepted';
--> statement-breakpoint
UPDATE "quotes" SET "risk_outcome" = 'no_market' WHERE "risk_outcome" = 'no_option';
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "carrier_open_url" text;
