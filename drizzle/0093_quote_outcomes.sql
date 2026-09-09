-- sep7de: first-class quote outcomes for Quotes-tab grouping.
-- Additive only. Does not wipe or reseed. No Policies.
-- risk_outcome: accepted | maybe | not_accepted | no_option
-- next_step: can_bind | fixable | hard_no (can_bind <=> bindable true)
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "risk_outcome" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "next_step" text;
