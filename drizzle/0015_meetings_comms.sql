ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "office_address" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "zoom_url" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "meet_url" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "byo_video_url" text;
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "video_provider" text DEFAULT 'none' NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "meeting_address" text;

ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "meeting_type" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "meeting_location" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "video_provider" text;
