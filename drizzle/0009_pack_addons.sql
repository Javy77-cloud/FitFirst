CREATE TABLE IF NOT EXISTS "desk_agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "slug" text NOT NULL,
  "display_name" text NOT NULL,
  "role" text DEFAULT 'agent' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "desk_agents_slug_uidx" ON "desk_agents" ("tenant_id","slug");

CREATE TABLE IF NOT EXISTS "column_layouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "agent_id" uuid REFERENCES "desk_agents"("id"),
  "table_id" text NOT NULL,
  "column_ids" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "column_layouts_lookup_idx" ON "column_layouts" ("tenant_id","table_id","agent_id");

CREATE TABLE IF NOT EXISTS "email_send_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "status" text DEFAULT 'disconnected' NOT NULL,
  "account_email" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agency_brand" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "agency_name" text NOT NULL,
  "logo_storage_path" text,
  "logo_mime" text,
  "default_color_preset" text DEFAULT 'agency' NOT NULL,
  "default_font_preset" text DEFAULT 'plex' NOT NULL,
  "default_density" text DEFAULT 'comfortable' NOT NULL,
  "default_column_layout" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "body_en" text NOT NULL,
  "body_es" text NOT NULL,
  "is_default" boolean DEFAULT true NOT NULL,
  "is_example_copy" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agent_ui_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "actor_key" text NOT NULL,
  "color_preset" text,
  "font_preset" text,
  "density" text,
  "column_layout" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "agent_ui_prefs_actor_idx" ON "agent_ui_prefs" ("tenant_id","actor_key");

CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text DEFAULT 'google' NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "display_email" text,
  "connected_at" timestamptz,
  "last_sync_at" timestamptz,
  "last_sync_direction" text,
  "last_sync_status" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "audience_type" text NOT NULL,
  "audience_value" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaign_send_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "campaign_id" uuid NOT NULL REFERENCES "email_campaigns"("id"),
  "recipient_email" text,
  "recipient_name" text,
  "outcome" text DEFAULT 'would_send' NOT NULL,
  "detail" text,
  "logged_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sms_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text DEFAULT 'none' NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "display_from" text,
  "notes" text,
  "last_connect_status" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "signature_envelopes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "document_id" uuid NOT NULL REFERENCES "documents"("id"),
  "provider" text DEFAULT 'docusign' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "signer_name" text,
  "signer_email" text,
  "subject" text,
  "last_provider_result" text,
  "sent_at" timestamptz,
  "signed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "portal_login" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "agent_portal_url" text;
