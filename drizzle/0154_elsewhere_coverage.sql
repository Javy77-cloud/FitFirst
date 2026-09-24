-- Contact Coverage Elsewhere rows: line, carrier, renewal, rough premium (JSONB like dependents).
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "elsewhere_coverage" jsonb NOT NULL DEFAULT '[]'::jsonb;
