CREATE TABLE IF NOT EXISTS "offices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "states" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "address" text,
  "timezone" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "offices_tenant_idx" ON "offices" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "offices_tenant_name_uidx" ON "offices" ("tenant_id","name");

CREATE TABLE IF NOT EXISTS "territories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "states" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "counties" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "geo_label" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "territories_tenant_idx" ON "territories" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "territories_tenant_name_uidx" ON "territories" ("tenant_id","name");

CREATE TABLE IF NOT EXISTS "territory_offices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "territory_id" uuid NOT NULL REFERENCES "territories"("id") ON DELETE CASCADE,
  "office_id" uuid NOT NULL REFERENCES "offices"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "territory_offices_uidx" ON "territory_offices" ("tenant_id","territory_id","office_id");
CREATE INDEX IF NOT EXISTS "territory_offices_office_idx" ON "territory_offices" ("tenant_id","office_id");

CREATE TABLE IF NOT EXISTS "user_offices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "office_id" uuid NOT NULL REFERENCES "offices"("id") ON DELETE CASCADE,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_offices_uidx" ON "user_offices" ("tenant_id","user_id","office_id");
CREATE INDEX IF NOT EXISTS "user_offices_office_idx" ON "user_offices" ("tenant_id","office_id");

CREATE TABLE IF NOT EXISTS "user_territories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "territory_id" uuid NOT NULL REFERENCES "territories"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_territories_uidx" ON "user_territories" ("tenant_id","user_id","territory_id");
CREATE INDEX IF NOT EXISTS "user_territories_territory_idx" ON "user_territories" ("tenant_id","territory_id");
