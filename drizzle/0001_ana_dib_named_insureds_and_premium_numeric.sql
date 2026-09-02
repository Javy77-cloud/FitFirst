ALTER TABLE "policies" ALTER COLUMN "premium" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "quote_attempt_logs" ALTER COLUMN "premium" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "premium" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "primary_named_insured" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "secondary_named_insured" text;