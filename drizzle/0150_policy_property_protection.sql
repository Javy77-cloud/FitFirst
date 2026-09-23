-- Durable Home property/protection snapshot on policies (wind mit, 4-point, alarms).
-- Filled fill-blanks-only at mint / issued-DEC Gemini transfer from Risk Profile.
--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "property_protection" jsonb;
