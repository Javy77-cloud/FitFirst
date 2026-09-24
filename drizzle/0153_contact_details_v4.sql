-- Contact Details sketch v4: nickname, phones, gender, spouse, dependents, DL (encrypted).
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "nickname" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "secondary_phone" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "spouse_name" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "spouse_dob" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "dependents" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "dl_state" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_enc" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_iv" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_last4" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_expiration" text;
