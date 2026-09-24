-- Sets policies.renewal_date to 2027-01-01 12:00 UTC (desk date-only noon stamp)
-- for Marketplace and Medicare policies whose term ends 2026-12-31 and whose
-- renewal date is blank or is that same term-end day.
--
-- Writes renewal_date only. Does not change premium, policy number, effective
-- date, expiration date, status, or updated_at.
--
-- Idempotent. A second run updates 0 rows. Wrapped in one transaction.
-- Never overwrites a renewal date that is neither blank nor 2026-12-31.
--
-- PNC is not included. There is no stored policy product type "PNC" in the Zoho
-- picklists this import uses. Do not treat insurance_type "P&C" as PNC.
--
-- Run the preview first, then this file, then the preview again.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/preview-marketplace-medicare-renewal-date.sql
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/backfill-marketplace-medicare-renewal-date.sql
-- The updated_row_count below is the live count. It is unknown until this runs.

BEGIN;

CREATE FUNCTION pg_temp.ff_business_date_key(value timestamptz)
RETURNS text
LANGUAGE sql
STABLE
AS $fn$
  SELECT CASE
    WHEN value IS NULL THEN NULL
    WHEN date_part('minute', value AT TIME ZONE 'UTC') = 0
     AND date_part('second', value AT TIME ZONE 'UTC') = 0
     AND date_part('hour', value AT TIME ZONE 'UTC') IN (0, 12)
    THEN to_char(value AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ELSE to_char(value AT TIME ZONE 'America/New_York', 'YYYY-MM-DD')
  END;
$fn$;

-- Exact product-type tokens only. Not a substring match.
-- Marketplace: Zoho Policy_Sub_Type "Marketplace", plus the desk aliases ACA / on-exchange.
-- Medicare: Zoho subtypes plus the desk Medicare A&B / MAPD labels, and the
-- policy-number display "Medicare" (same pattern as policy number "Marketplace").
-- PNC is intentionally absent. This repo has no policy type or subtype "PNC".
-- The only PNC text is certificate wording (primary and noncontributory).
-- insurance_type "P&C" is ordinary property and casualty and must not match.
CREATE FUNCTION pg_temp.ff_product_family(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE lower(btrim(coalesce(value, '')))
    WHEN 'marketplace' THEN 'Marketplace'
    WHEN 'aca' THEN 'Marketplace'
    WHEN 'on-exchange' THEN 'Marketplace'
    WHEN 'on exchange' THEN 'Marketplace'
    WHEN 'medicare' THEN 'Medicare'
    WHEN 'medicare advantage' THEN 'Medicare'
    WHEN 'medicare supplement (medigap)' THEN 'Medicare'
    WHEN 'part d (prescription)' THEN 'Medicare'
    WHEN 'medicare a&b' THEN 'Medicare'
    WHEN 'medicare a & b' THEN 'Medicare'
    WHEN 'medicare a and b' THEN 'Medicare'
    WHEN 'medicare parts a' THEN 'Medicare'
    WHEN 'medicare part a' THEN 'Medicare'
    WHEN 'original medicare' THEN 'Medicare'
    WHEN 'mapd' THEN 'Medicare'
    ELSE NULL
  END;
$fn$;

-- A filled policy subtype or form wins. A non-matching subtype (HO3, Supplemental
-- Health, and so on) does not fall through to the policy number. Policy number
-- "Marketplace" / "Medicare" counts only when subtype and form are both blank.
CREATE FUNCTION pg_temp.ff_row_family(sub text, form text, ptype text, number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN btrim(coalesce(sub, '')) <> '' THEN pg_temp.ff_product_family(sub)
    WHEN btrim(coalesce(form, '')) <> '' THEN pg_temp.ff_product_family(form)
    ELSE COALESCE(pg_temp.ff_product_family(ptype), pg_temp.ff_product_family(number))
  END;
$fn$;

CREATE FUNCTION pg_temp.ff_row_product_type(sub text, form text, ptype text, number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN btrim(coalesce(sub, '')) <> '' THEN btrim(sub)
    WHEN btrim(coalesce(form, '')) <> '' THEN btrim(form)
    WHEN pg_temp.ff_product_family(ptype) IS NOT NULL THEN btrim(ptype)
    ELSE btrim(number)
  END;
$fn$;

CREATE TEMP TABLE ff_cycle_renewal ON COMMIT DROP AS
SELECT
  p.id,
  COALESCE(
    NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)), ''),
    NULLIF(btrim(a.name), ''),
    '(no named insured)'
  ) AS named_insured,
  p.policy_number,
  CASE
    WHEN p.renewal_date IS NULL THEN '(empty)'
    ELSE pg_temp.ff_business_date_key(p.renewal_date)
      || ' ' || to_char(p.renewal_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  END AS current_renewal_value,
  pg_temp.ff_row_family(p.policy_sub_type, p.form_type, p.policy_type, p.policy_number) AS product_family,
  pg_temp.ff_row_product_type(p.policy_sub_type, p.form_type, p.policy_type, p.policy_number) AS product_type,
  p.status,
  p.premium,
  pg_temp.ff_business_date_key(p.expiration_date) AS expiration_day,
  CASE
    WHEN p.renewal_date IS NULL THEN 'update'
    WHEN pg_temp.ff_business_date_key(p.renewal_date) = '2026-12-31' THEN 'update'
    WHEN pg_temp.ff_business_date_key(p.renewal_date) = '2027-01-01' THEN 'already_jan_1'
    ELSE 'other'
  END AS renewal_bucket
FROM public.policies AS p
LEFT JOIN public.contacts AS c ON c.id = p.contact_id
LEFT JOIN public.accounts AS a ON a.id = p.account_id
WHERE pg_temp.ff_business_date_key(p.expiration_date) = '2026-12-31'
  AND pg_temp.ff_row_family(p.policy_sub_type, p.form_type, p.policy_type, p.policy_number) IS NOT NULL;

WITH updated AS (
  UPDATE public.policies AS p
  SET renewal_date = TIMESTAMPTZ '2027-01-01 12:00:00+00'
  FROM ff_cycle_renewal AS t
  WHERE p.id = t.id
    AND t.renewal_bucket = 'update'
    AND (
      p.renewal_date IS NULL
      OR pg_temp.ff_business_date_key(p.renewal_date) = '2026-12-31'
    )
    AND pg_temp.ff_business_date_key(p.expiration_date) = '2026-12-31'
  RETURNING p.id
)
SELECT count(*)::bigint AS updated_row_count FROM updated;

COMMIT;
