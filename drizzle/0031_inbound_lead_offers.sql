ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'referral';
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "email_from" text;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "email_subject" text;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "email_snippet" text;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "email_body" text;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "email_stub_id" text;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "claimed_by" uuid;
ALTER TABLE "lead_offers" ADD COLUMN IF NOT EXISTS "claimed_at" timestamp with time zone;

ALTER TABLE "lead_offer_claims" ADD COLUMN IF NOT EXISTS "relation" text;
