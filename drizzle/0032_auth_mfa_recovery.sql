ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_email" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_demo_bypass" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_recovery_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "kind" text NOT NULL,
  "token_hash" text NOT NULL,
  "stub_token" text,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_recovery_tokens_user_idx" ON "auth_recovery_tokens" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_recovery_tokens_hash_idx" ON "auth_recovery_tokens" ("token_hash");
--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD COLUMN IF NOT EXISTS "method" text;
--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD COLUMN IF NOT EXISTS "code_hash" text;
--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD COLUMN IF NOT EXISTS "stub_code" text;
--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD COLUMN IF NOT EXISTS "purpose" text DEFAULT 'verify' NOT NULL;
--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mfa_challenges' AND column_name = 'channel'
  ) THEN
    UPDATE "mfa_challenges" SET "method" = COALESCE("method", "channel") WHERE "method" IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mfa_challenges' AND column_name = 'code'
  ) THEN
    UPDATE "mfa_challenges" SET "stub_code" = COALESCE("stub_code", "code") WHERE "stub_code" IS NULL;
  END IF;
  UPDATE "mfa_challenges" SET "code_hash" = COALESCE("code_hash", '') WHERE "code_hash" IS NULL;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mfa_challenges' AND column_name = 'destination'
  ) THEN
    ALTER TABLE "mfa_challenges" ALTER COLUMN "destination" DROP NOT NULL;
  END IF;
END $$;
