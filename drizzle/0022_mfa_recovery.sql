ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enrolled" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_enroll_mfa" boolean NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_method" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recovery_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recovery_expires_at" timestamptz;

CREATE TABLE IF NOT EXISTS "mfa_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL,
  "channel" text NOT NULL,
  "destination" text NOT NULL,
  "code" text NOT NULL,
  "consumed_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mfa_challenges_user_idx" ON "mfa_challenges" ("tenant_id", "user_id", "created_at");
