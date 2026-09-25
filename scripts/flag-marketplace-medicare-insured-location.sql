-- Flag list (READ ONLY): Marketplace / Medicare policies with a blank insured
-- location that will NOT be filled.
--
-- Does not write. Not a drizzle migration — db:migrate will not run this.
-- Reasons are in missing_field: no contact, dangling contact, merged contact,
-- policy contact disagrees with the deal contact, contact address blank, or
-- the policy matches both Marketplace and Medicare.
--
--   psql "$DATABASE_URL" -f scripts/flag-marketplace-medicare-insured-location.sql
--
-- policy_id is included because policy_number is not unique.
-- policies_flagged is the count, repeated on each listed row. When nothing matches,
-- the query returns one row with policies_flagged = 0.
-- copy_state is the USPS code that would be written. It is blank when the contact
-- state is blank or cannot be mapped.
-- Flagged counts are only known after this runs on the live database.

-- SHARED-START
-- Classification + copy values for the Marketplace / Medicare insured-location backfill.
-- Preview, flag, and backfill files must keep this block identical.
--
-- Policy insured location (Policy record card label "Insured location"):
--   policies.premises_address  street only
--   policies.premises_city
--   policies.premises_state
--   policies.premises_zip
-- Blank means every one of those four is NULL, empty, or whitespace.
-- A partial location (any part non-blank) is left unchanged and is not flagged.
--
-- Contact insured location (Zoho Address_* → contact primary address; lead layout
-- label "Insured Address"; contact card fields Street / City / State / ZIP):
--   contacts.mailing_address
--   contacts.city
--   contacts.state
--   contacts.zip
-- Not used: desk_custom_field_values contact_mailing_* (separate mailing address),
-- locations (many property rows), risks, or accounts.
--
-- Named insured join:
--   policies.contact_id = contacts.id AND policies.tenant_id = contacts.tenant_id
-- Ambiguity check only (never a copy source):
--   policies.deal_id = deals.id AND policies.tenant_id = deals.tenant_id
--   flag when both contact ids are set and they differ.
-- Also flag: no policies.contact_id, dangling contact id, contacts.merged_into_id set,
-- a contact with no real address, or a contact state that is not a USPS code.
-- Do not follow merged_into_id.
-- A street is usable only when it contains a digit and is not a country-only
-- placeholder (United States / USA / US, ignoring punctuation and case).
-- Those contacts are flagged 'contact has no real address' and nothing is copied.
-- Contact state is written as a USPS code: strip a trailing ' (United States)',
-- map full state names case-insensitively, and upper-case 2-letter values.
-- An unmapped state flags the row and nothing is copied. A blank state stays blank.
--
-- Product (any one match). Not "every HEALTH policy".
-- Haystack: policy_sub_type, policy_type, form_type, insurance_type, source_product,
-- commission_family, string values in policies.tags, and line_of_business only when it
-- is still a pre-0143 product code (MARKETPLACE / ACA / MEDICARE / MEDIGAP / …).
-- Normalized: trim, underscores to spaces, case-fold.
-- Marketplace: word "marketplace", or exact aca / on-exchange / on exchange.
--   Also source_product health_marketplace and commission_family health_marketplace.
-- Medicare: word "medicare", medigap, mapd, "part d", med supp / medsupp,
--   or exact pdp / health ma (source_product health_ma).
--   Exact token "ma" counts only when the policy is Health
--   (line_of_business HEALTH, insurance_type Health, or policy_type Health),
--   so a P&C tag "MA" is not treated as Medicare.
-- Both families on one policy → flag, do not copy.
-- Supplemental Health, Dental, Vision, and line_of_business HEALTH alone do not match.
--
-- Copy is part-for-part. premises_address stays street-only: a trailing
-- ", City, ST ZIP" that repeats the contact parts is removed. When city, state,
-- and zip are all blank and mailing_address is "street, city, ST ZIP", it is split.
-- premises_state is the USPS code. Only NULL is written for a missing part.
-- No other policies column is updated.
WITH
params AS (
  SELECT '11111111-1111-4111-8111-111111111111'::uuid AS tenant_id
),
state_codes AS (
  SELECT *
  FROM (VALUES
    ('alabama', 'AL'),
    ('alaska', 'AK'),
    ('arizona', 'AZ'),
    ('arkansas', 'AR'),
    ('california', 'CA'),
    ('colorado', 'CO'),
    ('connecticut', 'CT'),
    ('delaware', 'DE'),
    ('district of columbia', 'DC'),
    ('florida', 'FL'),
    ('georgia', 'GA'),
    ('hawaii', 'HI'),
    ('idaho', 'ID'),
    ('illinois', 'IL'),
    ('indiana', 'IN'),
    ('iowa', 'IA'),
    ('kansas', 'KS'),
    ('kentucky', 'KY'),
    ('louisiana', 'LA'),
    ('maine', 'ME'),
    ('maryland', 'MD'),
    ('massachusetts', 'MA'),
    ('michigan', 'MI'),
    ('minnesota', 'MN'),
    ('mississippi', 'MS'),
    ('missouri', 'MO'),
    ('montana', 'MT'),
    ('nebraska', 'NE'),
    ('nevada', 'NV'),
    ('new hampshire', 'NH'),
    ('new jersey', 'NJ'),
    ('new mexico', 'NM'),
    ('new york', 'NY'),
    ('north carolina', 'NC'),
    ('north dakota', 'ND'),
    ('ohio', 'OH'),
    ('oklahoma', 'OK'),
    ('oregon', 'OR'),
    ('pennsylvania', 'PA'),
    ('rhode island', 'RI'),
    ('south carolina', 'SC'),
    ('south dakota', 'SD'),
    ('tennessee', 'TN'),
    ('texas', 'TX'),
    ('utah', 'UT'),
    ('vermont', 'VT'),
    ('virginia', 'VA'),
    ('washington', 'WA'),
    ('west virginia', 'WV'),
    ('wisconsin', 'WI'),
    ('wyoming', 'WY')
  ) AS codes(name, code)
),
policy_text AS (
  SELECT
    p.id,
    p.line_of_business,
    p.insurance_type,
    p.policy_type,
    (
      ARRAY_REMOVE(ARRAY[
        p.policy_sub_type,
        p.policy_type,
        p.form_type,
        p.insurance_type,
        p.source_product,
        p.commission_family,
        CASE
          WHEN upper(regexp_replace(btrim(coalesce(p.line_of_business, '')), '[[:space:]]+', ' ', 'g')) IN (
            'MARKETPLACE',
            'ACA',
            'ON-EXCHANGE',
            'ON EXCHANGE',
            'MEDICARE',
            'MEDICARE ADVANTAGE',
            'MEDIGAP',
            'MAPD',
            'PART D',
            'PART D (PRESCRIPTION)',
            'PDP'
          )
          THEN p.line_of_business
        END
      ]::text[], NULL)
      || COALESCE((
        SELECT array_agg(btrim(elem #>> '{}'))
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(p.tags) = 'array' THEN p.tags
            ELSE '[]'::jsonb
          END
        ) AS e(elem)
        WHERE jsonb_typeof(elem) = 'string'
          AND btrim(elem #>> '{}') <> ''
      ), ARRAY[]::text[])
    ) AS haystack
  FROM policies AS p
  JOIN params ON p.tenant_id = params.tenant_id
),
policy_norms AS (
  SELECT
    pt.id,
    pt.line_of_business,
    pt.insurance_type,
    pt.policy_type,
    lower(
      regexp_replace(
        regexp_replace(btrim(coalesce(h.raw, '')), '[_]+', ' ', 'g'),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ) AS norm
  FROM policy_text AS pt
  LEFT JOIN LATERAL unnest(pt.haystack) AS h(raw) ON true
),
policy_product AS (
  SELECT
    norms.id,
    COALESCE(bool_or(
      norms.norm ~ '(^|[^a-z0-9])marketplace([^a-z0-9]|$)'
      OR norms.norm = 'aca'
      OR norms.norm = 'on-exchange'
      OR norms.norm = 'on exchange'
    ), false) AS is_marketplace,
    COALESCE(bool_or(
      norms.norm ~ '(^|[^a-z0-9])medicare([^a-z0-9]|$)'
      OR norms.norm ~ '(^|[^a-z0-9])medigap([^a-z0-9]|$)'
      OR norms.norm ~ '(^|[^a-z0-9])mapd([^a-z0-9]|$)'
      OR norms.norm ~ '(^|[^a-z0-9])part d([^a-z0-9]|$)'
      OR norms.norm ~ '(^|[^a-z0-9])med[[:space:]-]?supp([^a-z0-9]|$)'
      OR norms.norm IN ('pdp', 'health ma')
    ), false)
    OR (
      COALESCE(bool_or(norms.norm = 'ma'), false)
      AND (
        upper(btrim(coalesce(max(norms.line_of_business), ''))) = 'HEALTH'
        OR btrim(coalesce(max(norms.insurance_type), '')) = 'Health'
        OR btrim(coalesce(max(norms.policy_type), '')) = 'Health'
      )
    ) AS is_medicare
  FROM policy_norms AS norms
  GROUP BY norms.id
),
contact_bits AS (
  SELECT
    c.id AS contact_id,
    c.tenant_id,
    c.merged_into_id,
    NULLIF(btrim(c.first_name), '') AS first_name,
    NULLIF(btrim(c.last_name), '') AS last_name,
    NULLIF(btrim(c.mailing_address), '') AS street0,
    NULLIF(btrim(c.city), '') AS city0,
    NULLIF(btrim(c.state), '') AS state0,
    NULLIF(btrim(c.zip), '') AS zip0
  FROM contacts AS c
  JOIN params ON c.tenant_id = params.tenant_id
),
contact_parsed AS (
  SELECT
    b.*,
    CASE
      WHEN b.city0 IS NULL AND b.state0 IS NULL AND b.zip0 IS NULL
      THEN regexp_match(
        b.street0,
        '^(.+?),\s*([^,]+?),\s*([A-Za-z]{2}),?\s+(\d{5}(?:-\d{4})?)\s*$'
      )
      ELSE NULL
    END AS parsed
  FROM contact_bits AS b
),
contact_parts AS (
  SELECT
    p.contact_id,
    p.tenant_id,
    p.merged_into_id,
    p.first_name,
    p.last_name,
    CASE
      WHEN p.parsed IS NOT NULL THEN NULLIF(btrim(p.parsed[1]), '')
      ELSE p.street0
    END AS street1,
    CASE
      WHEN p.parsed IS NOT NULL THEN NULLIF(btrim(p.parsed[2]), '')
      ELSE p.city0
    END AS city,
    CASE
      WHEN p.parsed IS NOT NULL THEN NULLIF(upper(btrim(p.parsed[3])), '')
      ELSE p.state0
    END AS state,
    CASE
      WHEN p.parsed IS NOT NULL THEN NULLIF(btrim(p.parsed[4]), '')
      ELSE p.zip0
    END AS zip
  FROM contact_parsed AS p
),
contact_normalized AS (
  SELECT
    cp.contact_id,
    cp.tenant_id,
    cp.merged_into_id,
    cp.first_name,
    cp.last_name,
    cp.street1,
    cp.city,
    cp.zip,
    NULLIF(
      btrim(
        regexp_replace(
          btrim(coalesce(cp.state, '')),
          '[[:space:]]*\([[:space:]]*united states[[:space:]]*\)[[:space:]]*$',
          '',
          'i'
        )
      ),
      ''
    ) AS state_label
  FROM contact_parts AS cp
),
contact_state AS (
  SELECT
    n.*,
    CASE
      WHEN n.state_label ~ '^[A-Za-z]{2}$' THEN upper(n.state_label)
      ELSE codes.code
    END AS state_code,
    n.state_label IS NOT NULL
      AND CASE
        WHEN n.state_label ~ '^[A-Za-z]{2}$' THEN upper(n.state_label)
        ELSE codes.code
      END IS NULL AS state_unmapped
  FROM contact_normalized AS n
  LEFT JOIN state_codes AS codes ON codes.name = lower(n.state_label)
),
contact_address AS (
  SELECT
    cp.contact_id,
    cp.tenant_id,
    cp.merged_into_id,
    cp.first_name,
    cp.last_name,
    cp.city,
    cp.state_code,
    cp.state_unmapped,
    cp.zip,
    COALESCE(
      (
        SELECT NULLIF(btrim(left(cp.street1, length(cp.street1) - length(suf.s)), ' ,'), '')
        FROM unnest(ARRAY[
          cp.state_code,
          CASE
            WHEN cp.state_label IS DISTINCT FROM cp.state_code THEN cp.state_label
          END
        ]) AS st(token)
        CROSS JOIN LATERAL (
          SELECT candidate
          FROM (VALUES
            (CASE
              WHEN cp.city IS NOT NULL AND st.token IS NOT NULL AND cp.zip IS NOT NULL
              THEN ', ' || cp.city || ', ' || st.token || ' ' || cp.zip
            END),
            (CASE
              WHEN cp.city IS NOT NULL AND st.token IS NOT NULL AND cp.zip IS NOT NULL
              THEN ', ' || cp.city || ', ' || st.token || ', ' || cp.zip
            END),
            (CASE
              WHEN cp.city IS NOT NULL AND st.token IS NOT NULL AND cp.zip IS NOT NULL
              THEN ', ' || cp.city || ' ' || st.token || ' ' || cp.zip
            END),
            (CASE
              WHEN cp.city IS NOT NULL AND st.token IS NOT NULL
              THEN ', ' || cp.city || ', ' || st.token
            END),
            (CASE
              WHEN st.token IS NOT NULL AND cp.zip IS NOT NULL
              THEN ', ' || st.token || ' ' || cp.zip
            END),
            (CASE WHEN cp.zip IS NOT NULL THEN ', ' || cp.zip END),
            (CASE WHEN cp.city IS NOT NULL THEN ', ' || cp.city END)
          ) AS candidates(candidate)
        ) AS suf(s)
        WHERE suf.s IS NOT NULL
          AND cp.street1 IS NOT NULL
          AND length(cp.street1) > length(suf.s)
          AND lower(right(cp.street1, length(suf.s))) = lower(suf.s)
          AND NULLIF(btrim(left(cp.street1, length(cp.street1) - length(suf.s)), ' ,'), '') IS NOT NULL
        ORDER BY length(suf.s) DESC
        LIMIT 1
      ),
      cp.street1
    ) AS street
  FROM contact_state AS cp
),
contact_ready AS (
  SELECT
    ca.*,
    ca.street IS NOT NULL
      AND ca.street ~ '[[:digit:]]'
      AND btrim(regexp_replace(lower(btrim(ca.street)), '[^a-z0-9]+', ' ', 'g')) NOT IN (
        'united states',
        'usa',
        'us',
        'u s',
        'u s a'
      ) AS street_usable
  FROM contact_address AS ca
),
insured_location_work AS (
  SELECT
    p.id AS policy_id,
    p.policy_number,
    COALESCE(concat_ws(' ', ca.first_name, ca.last_name), '') AS contact_name,
    CASE
      WHEN pp.is_marketplace AND NOT pp.is_medicare THEN 'Marketplace'
      WHEN pp.is_medicare AND NOT pp.is_marketplace THEN 'Medicare'
      WHEN pp.is_marketplace AND pp.is_medicare THEN 'both'
    END AS product_family,
    CASE
      WHEN pp.is_marketplace AND pp.is_medicare THEN 'flag'
      WHEN p.contact_id IS NULL THEN 'flag'
      WHEN ca.contact_id IS NULL THEN 'flag'
      WHEN ca.merged_into_id IS NOT NULL THEN 'flag'
      WHEN d.contact_id IS NOT NULL
        AND p.contact_id IS NOT NULL
        AND d.contact_id <> p.contact_id THEN 'flag'
      WHEN ca.contact_id IS NOT NULL
        AND NOT ca.street_usable
        AND (
          ca.street IS NOT NULL
          OR (ca.city IS NULL AND ca.state_code IS NULL AND ca.zip IS NULL)
        ) THEN 'flag'
      WHEN ca.state_unmapped THEN 'flag'
      ELSE 'fill'
    END AS action,
    NULLIF(concat_ws('; ',
      CASE
        WHEN pp.is_marketplace AND pp.is_medicare
        THEN 'ambiguous product (Marketplace and Medicare both match)'
      END,
      CASE WHEN p.contact_id IS NULL THEN 'policies.contact_id' END,
      CASE
        WHEN p.contact_id IS NOT NULL AND ca.contact_id IS NULL
        THEN 'contacts.id'
      END,
      CASE WHEN ca.merged_into_id IS NOT NULL THEN 'contacts.merged_into_id' END,
      CASE
        WHEN d.contact_id IS NOT NULL
          AND p.contact_id IS NOT NULL
          AND d.contact_id <> p.contact_id
        THEN 'policies.contact_id <> deals.contact_id'
      END,
      CASE
        WHEN ca.contact_id IS NOT NULL
          AND NOT ca.street_usable
          AND (
            ca.street IS NOT NULL
            OR (ca.city IS NULL AND ca.state_code IS NULL AND ca.zip IS NULL)
          )
        THEN 'contact has no real address'
      END,
      CASE WHEN ca.state_unmapped THEN 'contacts.state' END
    ), '') AS missing_field,
    CASE WHEN ca.street_usable THEN ca.street END AS copy_street,
    ca.city AS copy_city,
    ca.state_code AS copy_state,
    ca.zip AS copy_zip,
    NULLIF(concat_ws(', ',
      CASE WHEN ca.street_usable THEN ca.street END,
      NULLIF(concat_ws(', ', ca.city, ca.state_code, ca.zip), '')
    ), '') AS copy_display
  FROM policies AS p
  JOIN params ON p.tenant_id = params.tenant_id
  JOIN policy_product AS pp ON pp.id = p.id
  LEFT JOIN contact_ready AS ca
    ON ca.contact_id = p.contact_id
   AND ca.tenant_id = p.tenant_id
  LEFT JOIN deals AS d
    ON d.id = p.deal_id
   AND d.tenant_id = p.tenant_id
  WHERE (pp.is_marketplace OR pp.is_medicare)
    AND NULLIF(regexp_replace(coalesce(p.premises_address, ''), '[[:space:]]+', '', 'g'), '') IS NULL
    AND NULLIF(regexp_replace(coalesce(p.premises_city, ''), '[[:space:]]+', '', 'g'), '') IS NULL
    AND NULLIF(regexp_replace(coalesce(p.premises_state, ''), '[[:space:]]+', '', 'g'), '') IS NULL
    AND NULLIF(regexp_replace(coalesce(p.premises_zip, ''), '[[:space:]]+', '', 'g'), '') IS NULL
)
-- SHARED-END
SELECT
  count(*) OVER ()::bigint AS policies_flagged,
  policy_id,
  policy_number,
  contact_name,
  missing_field,
  copy_state
FROM insured_location_work
WHERE action = 'flag'
UNION ALL
SELECT
  0::bigint,
  NULL::uuid,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text
WHERE NOT EXISTS (
  SELECT 1 FROM insured_location_work WHERE action = 'flag'
)
ORDER BY policy_number NULLS FIRST, policy_id NULLS FIRST;
