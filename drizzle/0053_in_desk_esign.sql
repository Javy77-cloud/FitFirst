ALTER TABLE "deals"
  ADD COLUMN IF NOT EXISTS "esign_status" text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "esign_requested_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "esign_signed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "esign_signer_name" text,
  ADD COLUMN IF NOT EXISTS "esign_document_id" uuid;

ALTER TABLE "policies"
  ADD COLUMN IF NOT EXISTS "esign_status" text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "esign_requested_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "esign_signed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "esign_signer_name" text,
  ADD COLUMN IF NOT EXISTS "esign_document_id" uuid;

ALTER TABLE "signature_envelopes"
  ADD COLUMN IF NOT EXISTS "deal_id" uuid,
  ADD COLUMN IF NOT EXISTS "policy_id" uuid,
  ADD COLUMN IF NOT EXISTS "mode" text NOT NULL DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS "signature_kind" text,
  ADD COLUMN IF NOT EXISTS "signature_data" text,
  ADD COLUMN IF NOT EXISTS "signed_by_role" text,
  ADD COLUMN IF NOT EXISTS "public_token" text;

CREATE UNIQUE INDEX IF NOT EXISTS "signature_envelopes_token_uidx"
  ON "signature_envelopes" ("public_token")
  WHERE "public_token" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "signature_envelopes_deal_idx"
  ON "signature_envelopes" ("tenant_id", "deal_id");

CREATE INDEX IF NOT EXISTS "signature_envelopes_policy_idx"
  ON "signature_envelopes" ("tenant_id", "policy_id");
