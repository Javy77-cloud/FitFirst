ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email_opt_out" boolean DEFAULT false NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opt_out" boolean DEFAULT false NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email_opted_out_at" timestamptz;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opted_out_at" timestamptz;
