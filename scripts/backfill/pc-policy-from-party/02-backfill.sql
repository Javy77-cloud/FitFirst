-- Transactional P&C party backfill.
-- Fills blank fields only. Rolls back the whole script if any statement fails.
-- Does not write commission, premium, carrier, dates, limits, deductibles, VINs,
-- construction, status, or renewal_date. Does not insert alerts.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/backfill/pc-policy-from-party/02-backfill.sql
--
-- Safe to re-run. A second run fills nothing that the first run already filled.
-- Change-log rows are written only for values this transaction actually stored.

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10min';
SET LOCAL client_min_messages = warning;
\ir 00-resolve.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ff_pc_fills WHERE field_key ~* 'commission') THEN
    RAISE EXCEPTION 'refusing to fill a commission field';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ff_pc_fills
    WHERE field_key IN (
      'premium', 'carrier', 'policy_number', 'effective_date', 'expiration_date',
      'renewal_date', 'status', 'coverage_a', 'coverage_limits', 'vin',
      'year_built', 'construction', 'roof_year', 'roof_covering', 'square_feet', 'stories',
      'aop_deductible', 'hurricane_deductible', 'comprehensive_deductible', 'collision_deductible'
    )
  ) THEN
    RAISE EXCEPTION 'refusing to fill an excluded underwriting field';
  END IF;
END $$;

CREATE TEMP TABLE ff_pc_applied (
  policy_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  log_key text NOT NULL,
  field_label text NOT NULL,
  new_value text NOT NULL,
  event_id uuid NOT NULL
);

\echo '=== contact_id filled ==='
WITH updated AS (
  UPDATE policies p
  SET contact_id = f.new_value::uuid,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'contact_id'
    AND p.contact_id IS NULL
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied
  SELECT * FROM updated
  RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== account_id filled ==='
WITH updated AS (
  UPDATE policies p
  SET account_id = f.new_value::uuid,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'account_id'
    AND p.account_id IS NULL
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied
  SELECT * FROM updated
  RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== premises_address filled ==='
WITH updated AS (
  UPDATE policies p
  SET premises_address = f.new_value,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'premises_address'
    AND (p.premises_address IS NULL OR btrim(p.premises_address) = '')
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied SELECT * FROM updated RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== premises_city filled ==='
WITH updated AS (
  UPDATE policies p
  SET premises_city = f.new_value,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'premises_city'
    AND (p.premises_city IS NULL OR btrim(p.premises_city) = '')
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied SELECT * FROM updated RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== premises_state filled ==='
WITH updated AS (
  UPDATE policies p
  SET premises_state = f.new_value,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'premises_state'
    AND (p.premises_state IS NULL OR btrim(p.premises_state) = '')
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied SELECT * FROM updated RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== premises_zip filled ==='
WITH updated AS (
  UPDATE policies p
  SET premises_zip = f.new_value,
      updated_at = now()
  FROM ff_pc_fills f
  WHERE f.policy_id = p.id
    AND f.field_key = 'premises_zip'
    AND (p.premises_zip IS NULL OR btrim(p.premises_zip) = '')
  RETURNING p.id, p.tenant_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied SELECT * FROM updated RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== policy custom values filled ==='
WITH updated AS (
  INSERT INTO desk_custom_field_values (tenant_id, module, record_id, field_key, value)
  SELECT f.tenant_id, 'policies', f.policy_id, f.field_key, f.new_value
  FROM ff_pc_fills f
  WHERE f.target = 'custom'
  ON CONFLICT (tenant_id, module, record_id, field_key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  WHERE desk_custom_field_values.value IS NULL
     OR btrim(desk_custom_field_values.value) = ''
  RETURNING tenant_id, record_id, field_key, value
),
saved AS (
  INSERT INTO ff_pc_applied (policy_id, tenant_id, log_key, field_label, new_value, event_id)
  SELECT u.record_id, u.tenant_id, f.log_key, f.field_label, u.value, f.event_id
  FROM updated u
  JOIN ff_pc_fills f
    ON f.policy_id = u.record_id
   AND f.field_key = u.field_key
   AND f.target = 'custom'
  RETURNING policy_id
)
SELECT count(*)::bigint AS rows_upserted FROM saved;

\echo '=== driver date of birth filled ==='
WITH updated AS (
  UPDATE drivers d
  SET date_of_birth = f.new_value,
      contact_id = COALESCE(d.contact_id, r.resolved_contact_id),
      updated_at = now()
  FROM ff_pc_fills f
  JOIN ff_pc_resolved r ON r.policy_id = f.policy_id
  WHERE f.target = 'drivers.date_of_birth'
    AND d.id = f.target_id
    AND (d.date_of_birth IS NULL OR btrim(d.date_of_birth) = '')
    AND (d.contact_id IS NULL OR d.contact_id = r.resolved_contact_id)
  RETURNING d.tenant_id, f.policy_id, f.log_key, f.field_label, f.new_value, f.event_id
),
saved AS (
  INSERT INTO ff_pc_applied
  SELECT policy_id, tenant_id, log_key, field_label, new_value, event_id
  FROM updated
  RETURNING policy_id
)
SELECT count(*)::bigint AS rows_updated FROM saved;

\echo '=== change log rows ==='
WITH inserted AS (
  INSERT INTO policy_change_logs (
    tenant_id, policy_id, changed_by, changed_by_name, changed_at,
    field_key, field_label, before_value, after_value, source, event_id
  )
  SELECT
    a.tenant_id,
    a.policy_id,
    NULL,
    'P&C party backfill',
    now(),
    a.log_key,
    a.field_label,
    NULL,
    a.new_value,
    'pc_party_backfill',
    a.event_id
  FROM ff_pc_applied a
  RETURNING id
)
SELECT count(*)::bigint AS rows_inserted FROM inserted;

COMMIT;
