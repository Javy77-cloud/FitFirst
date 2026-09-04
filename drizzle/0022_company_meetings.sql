ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "video_url" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "invite_audience" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "invite_office_id" uuid;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "invite_territory_id" uuid;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid;

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "user_id" uuid;

CREATE TABLE IF NOT EXISTS "calendar_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "activity_id" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_invites_uidx" ON "calendar_invites" ("tenant_id","activity_id","user_id");
CREATE INDEX IF NOT EXISTS "calendar_invites_user_idx" ON "calendar_invites" ("tenant_id","user_id");
