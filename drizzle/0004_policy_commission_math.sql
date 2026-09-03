ALTER TABLE "policies" ADD COLUMN "insurance_type" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "policy_type" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "policy_sub_type" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "premium_frequency" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "number_of_insured" integer;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "gwp" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "commission4" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "insurance_type" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "policy_type" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "policy_sub_type" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "premium_frequency" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "number_of_insured" integer;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "gwp" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "commission4" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "initial_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "deferred_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "monthly_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_annual_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "payment_status" text;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "payment_reference_batch" text;
