-- Account Coverage Elsewhere rows: line, carrier, renewal, rough premium (JSONB like contacts.elsewhere_coverage).
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "elsewhere_coverage" jsonb NOT NULL DEFAULT '[]'::jsonb;
