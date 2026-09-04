ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "kind" text,
  ADD COLUMN IF NOT EXISTS "subject_en" text,
  ADD COLUMN IF NOT EXISTS "body_en" text,
  ADD COLUMN IF NOT EXISTS "subject_es" text,
  ADD COLUMN IF NOT EXISTS "body_es" text,
  ADD COLUMN IF NOT EXISTS "is_seeded" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_example_copy" boolean NOT NULL DEFAULT false;

ALTER TABLE "email_triggers"
  ADD COLUMN IF NOT EXISTS "delay_amount" integer,
  ADD COLUMN IF NOT EXISTS "slug" text,
  ADD COLUMN IF NOT EXISTS "delay_unit" text,
  ADD COLUMN IF NOT EXISTS "event_kind" text,
  ADD COLUMN IF NOT EXISTS "send_from_provider" text,
  ADD COLUMN IF NOT EXISTS "email_client" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "create_broker_task" boolean NOT NULL DEFAULT false;

ALTER TABLE "email_send_jobs"
  ADD COLUMN IF NOT EXISTS "to_email" text,
  ADD COLUMN IF NOT EXISTS "subject" text,
  ADD COLUMN IF NOT EXISTS "body" text,
  ADD COLUMN IF NOT EXISTS "send_from_provider" text,
  ADD COLUMN IF NOT EXISTS "hold_reason" text,
  ADD COLUMN IF NOT EXISTS "last_error" text,
  ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "locale" text,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "policies"
  ADD COLUMN IF NOT EXISTS "gwp" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "commission4" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "premium_frequency" text,
  ADD COLUMN IF NOT EXISTS "number_of_insured" integer;

ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "insurance_type" text,
  ADD COLUMN IF NOT EXISTS "policy_type" text,
  ADD COLUMN IF NOT EXISTS "policy_sub_type" text,
  ADD COLUMN IF NOT EXISTS "selling_agency" text,
  ADD COLUMN IF NOT EXISTS "gwp" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "commission4" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "premium_frequency" text,
  ADD COLUMN IF NOT EXISTS "number_of_insured" integer,
  ADD COLUMN IF NOT EXISTS "payment_status" text,
  ADD COLUMN IF NOT EXISTS "payment_reference_batch" text,
  ADD COLUMN IF NOT EXISTS "initial_commission" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "deferred_commission" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "monthly_commission" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "total_annual_commission" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "agency_amount" numeric(12, 2);

ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "preferred_language" text,
  ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "activity_logs"
  ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
