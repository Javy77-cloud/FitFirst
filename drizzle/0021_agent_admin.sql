ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "access_status" text NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_access_modules" boolean NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_see_agency_widgets" boolean NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "office_label" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "territory_label" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_set_password" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_expires_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_expires_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "frozen_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "removed_at" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_username_idx" ON "users" ("tenant_id", "username");

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "recipient_user_id" uuid;

CREATE TABLE IF NOT EXISTS "desk_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "from_user_id" uuid NOT NULL,
  "to_user_id" uuid NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "desk_messages_to_idx" ON "desk_messages" ("tenant_id", "to_user_id", "created_at");
