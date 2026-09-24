-- Shared resolution for the P&C party backfill.
-- Session temp objects only. No DDL on the live schema. No writes to base tables.
-- Included by the preview, backfill, flag export, and notes scripts.
--
-- Blank = NULL or whitespace-only text. Numeric / timestamp blank = NULL.
-- A stored 0 is a value and is left alone.

DROP TABLE IF EXISTS ff_pc_flags;
DROP TABLE IF EXISTS ff_pc_fills;
DROP TABLE IF EXISTS ff_pc_resolved;
DROP TABLE IF EXISTS ff_pc_scope;

CREATE OR REPLACE FUNCTION pg_temp.is_blank(val text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT val IS NULL OR btrim(val) = '';
$$;

CREATE OR REPLACE FUNCTION pg_temp.compact_key(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(lower(coalesce(val, '')), '[^a-z0-9]+', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION pg_temp.zip5(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(left(regexp_replace(coalesce(val, ''), '\D', '', 'g'), 5), '');
$$;

-- Person match key. Comma form is "Last, First". ALL-CAPS two tokens are "LAST FIRST".
-- Mixed-case and 3+ token names stay in the order stored. Compared lowercased.
CREATE OR REPLACE FUNCTION pg_temp.norm_person(val text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  parts text[];
  letters text;
  last_part text;
  rest_part text;
BEGIN
  IF val IS NULL THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(btrim(val), '\s+', ' ', 'g');
  IF cleaned = '' THEN
    RETURN NULL;
  END IF;
  IF position(',' IN cleaned) > 0 THEN
    last_part := btrim(split_part(cleaned, ',', 1));
    rest_part := btrim(substr(cleaned, position(',' IN cleaned) + 1));
    IF last_part <> '' AND rest_part <> '' THEN
      cleaned := regexp_replace(rest_part || ' ' || last_part, '\s+', ' ', 'g');
    ELSE
      cleaned := regexp_replace(btrim(replace(cleaned, ',', ' ')), '\s+', ' ', 'g');
    END IF;
  ELSE
    parts := regexp_split_to_array(cleaned, ' ');
    letters := regexp_replace(cleaned, '[^A-Za-z]', '', 'g');
    IF letters <> '' AND letters = upper(letters) AND cardinality(parts) = 2 THEN
      cleaned := parts[2] || ' ' || parts[1];
    END IF;
  END IF;
  RETURN lower(cleaned);
END;
$$;

-- Business names are not reordered. "Acme, LLC" stays "acme, llc".
CREATE OR REPLACE FUNCTION pg_temp.norm_business(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(regexp_replace(btrim(coalesce(val, '')), '\s+', ' ', 'g')), '');
$$;

-- Flag label only. First Last, title-cased. Does not write this form onto a policy.
CREATE OR REPLACE FUNCTION pg_temp.person_display(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(initcap(pg_temp.norm_person(val)), '');
$$;

CREATE OR REPLACE FUNCTION pg_temp.contact_display(first_name text, last_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      btrim(concat_ws(' ', NULLIF(btrim(first_name), ''), NULLIF(btrim(last_name), ''))),
      '\s+',
      ' ',
      'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.same_text(a text, b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(btrim(coalesce(a, '')), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(coalesce(b, '')), '\s+', ' ', 'g'));
$$;

-- P&C book. Life, Health, Marketplace, and Medicare are out of scope
-- (renewal dates and Marketplace/Medicare insured location belong to other PRs).
CREATE TEMP TABLE ff_pc_scope AS
WITH classified AS (
  SELECT
    p.*,
    upper(btrim(p.line_of_business)) AS line_u,
    lower(btrim(coalesce(p.policy_type, ''))) AS type_l,
    pg_temp.compact_key(coalesce(NULLIF(btrim(p.policy_sub_type), ''), NULLIF(btrim(p.form_type), ''))) AS sub_c,
    d.contact_id AS deal_contact_id,
    d.account_id AS deal_account_id,
    NULLIF(btrim(d.primary_named_insured), '') AS deal_named,
    named_custom.value AS custom_named
  FROM policies p
  LEFT JOIN deals d
    ON d.id = p.deal_id
   AND d.tenant_id = p.tenant_id
  LEFT JOIN LATERAL (
    SELECT v.value
    FROM desk_custom_field_values v
    WHERE v.tenant_id = p.tenant_id
      AND v.module = 'policies'
      AND v.record_id = p.id
      AND v.field_key IN ('named_insured', 'insured_name', 'primary_named_insured')
      AND NOT pg_temp.is_blank(v.value)
    ORDER BY CASE v.field_key
      WHEN 'named_insured' THEN 1
      WHEN 'primary_named_insured' THEN 2
      ELSE 3
    END
    LIMIT 1
  ) named_custom ON true
)
SELECT
  c.*,
  COALESCE(c.deal_named, NULLIF(btrim(c.custom_named), '')) AS match_name,
  CASE
    WHEN c.line_u IN ('GL', 'BOP', 'WC', 'CGL', 'COMMERCIAL', 'CPP', 'PACKAGE')
      OR c.type_l IN ('commercial', 'workers'' comp', 'workers comp')
      OR COALESCE(c.sub_c, '') IN (
        'commercialauto', 'businessownerspolicybop', 'generalliability', 'commercialproperty',
        'workerscomp', 'commercialumbrella', 'cyber', 'professionalliabilityeo', 'excessliability',
        'bop', 'gl', 'cgl'
      )
      OR COALESCE(c.sub_c, '') LIKE 'workerscomp%'
      OR COALESCE(c.sub_c, '') LIKE '%commercial%'
      THEN 'account'
    ELSE 'contact'
  END AS party_kind,
  CASE
    WHEN COALESCE(c.sub_c, '') LIKE '%commercialauto%'
      OR (c.line_u = 'AUTO' AND COALESCE(c.sub_c, '') LIKE '%commercial%')
      THEN 'commercial_auto'
    WHEN (
        c.line_u IN ('GL', 'BOP', 'WC', 'CGL', 'COMMERCIAL', 'CPP', 'PACKAGE')
        OR c.type_l IN ('commercial', 'workers'' comp', 'workers comp')
        OR COALESCE(c.sub_c, '') LIKE '%commercial%'
        OR COALESCE(c.sub_c, '') IN ('bop', 'gl', 'cgl', 'workerscomp', 'cyber', 'professionalliabilityeo', 'excessliability')
        OR COALESCE(c.sub_c, '') LIKE 'workerscomp%'
      )
      AND (
        c.line_u IN ('BOP', 'CPP', 'COMMERCIAL')
        OR COALESCE(c.sub_c, '') LIKE '%bop%'
        OR COALESCE(c.sub_c, '') LIKE '%commercialproperty%'
      )
      THEN 'commercial_property'
    WHEN c.line_u IN ('GL', 'BOP', 'WC', 'CGL', 'COMMERCIAL', 'CPP', 'PACKAGE')
      OR c.type_l IN ('commercial', 'workers'' comp', 'workers comp')
      OR COALESCE(c.sub_c, '') LIKE '%commercial%'
      OR COALESCE(c.sub_c, '') IN ('bop', 'gl', 'cgl', 'workerscomp', 'cyber', 'professionalliabilityeo', 'excessliability')
      OR COALESCE(c.sub_c, '') LIKE 'workerscomp%'
      THEN 'commercial_other'
    WHEN COALESCE(c.sub_c, '') LIKE 'dp%'
      OR COALESCE(c.sub_c, '') LIKE '%landlord%'
      OR COALESCE(c.sub_c, '') LIKE '%dwelling%'
      THEN 'dwelling_landlord'
    WHEN c.line_u IN ('FLOOD', 'NFIP')
      OR COALESCE(c.sub_c, '') LIKE '%flood%'
      THEN 'flood'
    WHEN COALESCE(c.sub_c, '') LIKE 'ho3%'
      OR COALESCE(c.sub_c, '') LIKE 'ho4%'
      OR COALESCE(c.sub_c, '') LIKE 'ho5%'
      OR COALESCE(c.sub_c, '') LIKE 'ho6%'
      OR COALESCE(c.sub_c, '') LIKE 'ho8%'
      OR COALESCE(c.sub_c, '') IN ('renters', 'home', 'homeowners', 'homeowner')
      OR (c.line_u IN ('HO', 'HOME', 'HOMEOWNERS') AND c.sub_c IS NULL AND c.type_l = 'home')
      THEN 'residence'
    WHEN c.line_u IN ('HO', 'HOME', 'HOMEOWNERS')
      THEN 'ho_unspecified'
    WHEN c.line_u IN ('AUTO', 'PA')
      OR COALESCE(c.sub_c, '') IN ('auto', 'motorcycle', 'rideshareuberlift', 'classiccollection', 'pa')
      OR COALESCE(c.sub_c, '') LIKE '%motorcycle%'
      OR (COALESCE(c.sub_c, '') LIKE '%auto%' AND COALESCE(c.sub_c, '') NOT LIKE '%commercial%')
      THEN 'auto'
    WHEN c.line_u = 'RV'
      OR COALESCE(c.sub_c, '') IN ('boatowners', 'yatch', 'yacht', 'rv', 'traveltrailer', 'camper', 'specialty', 'boat')
      OR COALESCE(c.sub_c, '') LIKE '%watercraft%'
      OR COALESCE(c.sub_c, '') LIKE '%boat%'
      THEN 'recreational'
    ELSE 'other_pc'
  END AS line_class
FROM classified c
WHERE NOT (
  lower(btrim(coalesce(c.insurance_type, ''))) IN ('life', 'health')
  OR lower(btrim(coalesce(c.commission_family, ''))) IN (
    'life', 'health_marketplace', 'medicare_advantage', 'other_health'
  )
  OR c.line_u IN ('LIFE', 'HEALTH', 'ACCIDENT')
  OR c.type_l IN ('life', 'health')
  OR COALESCE(c.sub_c, '') IN (
    'termlife', 'wholelife', 'universallife', 'indexeduniversallifeiul', 'finalexpense', 'accidentaldeath',
    'individualhealth', 'marketplace', 'shorttermmedical', 'supplementalhealth', 'dental', 'vision',
    'medicareadvantage', 'medicaresupplementmedigap', 'partdprescription', 'medigap', 'medicare', 'aca'
  )
  OR lower(concat_ws(' ',
    c.insurance_type, c.commission_family, c.line_of_business, c.policy_type, c.policy_sub_type, c.form_type
  )) ~ 'marketplace|medicare|medigap|on-exchange|supplemental health|part d'
);

CREATE INDEX ON ff_pc_scope (id);
CREATE INDEX ON ff_pc_scope (tenant_id);

CREATE TEMP TABLE ff_pc_name_contact AS
SELECT
  s.id AS policy_id,
  count(*)::int AS hits,
  CASE WHEN count(*) = 1 THEN min(c.id::text)::uuid ELSE NULL END AS contact_id
FROM ff_pc_scope s
JOIN contacts c
  ON c.tenant_id = s.tenant_id
 AND c.merged_into_id IS NULL
 AND pg_temp.norm_person(concat_ws(' ', c.first_name, c.last_name)) = pg_temp.norm_person(s.match_name)
WHERE s.party_kind = 'contact'
  AND s.contact_id IS NULL
  AND s.deal_contact_id IS NULL
  AND pg_temp.norm_person(s.match_name) IS NOT NULL
GROUP BY s.id;

CREATE TEMP TABLE ff_pc_name_account AS
SELECT
  s.id AS policy_id,
  count(*)::int AS hits,
  CASE WHEN count(*) = 1 THEN min(a.id::text)::uuid ELSE NULL END AS account_id
FROM ff_pc_scope s
JOIN accounts a
  ON a.tenant_id = s.tenant_id
 AND a.merged_into_id IS NULL
 AND a.is_example = false
 AND pg_temp.norm_business(a.name) = pg_temp.norm_business(s.match_name)
WHERE s.party_kind = 'account'
  AND s.account_id IS NULL
  AND s.deal_account_id IS NULL
  AND pg_temp.norm_business(s.match_name) IS NOT NULL
GROUP BY s.id;

-- legal_name only when the account name matched nobody.
CREATE TEMP TABLE ff_pc_name_legal AS
SELECT
  s.id AS policy_id,
  count(*)::int AS hits,
  CASE WHEN count(*) = 1 THEN min(a.id::text)::uuid ELSE NULL END AS account_id
FROM ff_pc_scope s
JOIN accounts a
  ON a.tenant_id = s.tenant_id
 AND a.merged_into_id IS NULL
 AND a.is_example = false
 AND pg_temp.norm_business(a.legal_name) = pg_temp.norm_business(s.match_name)
WHERE s.party_kind = 'account'
  AND s.account_id IS NULL
  AND s.deal_account_id IS NULL
  AND pg_temp.norm_business(s.match_name) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM accounts a2
    WHERE a2.tenant_id = s.tenant_id
      AND a2.merged_into_id IS NULL
      AND a2.is_example = false
      AND pg_temp.norm_business(a2.name) = pg_temp.norm_business(s.match_name)
  )
GROUP BY s.id;

CREATE TEMP TABLE ff_pc_resolved AS
SELECT
  s.id AS policy_id,
  s.tenant_id,
  s.policy_number,
  s.line_of_business,
  s.line_class,
  s.party_kind,
  s.contact_id AS policy_contact_id,
  s.account_id AS policy_account_id,
  s.deal_id,
  s.risk_id,
  s.location_id,
  s.carrier_id,
  s.producer,
  s.match_name,
  link.link_status,
  link.resolved_contact_id,
  link.resolved_account_id,
  link.name_hits,
  CASE
    WHEN s.party_kind = 'contact' AND c.id IS NOT NULL THEN pg_temp.contact_display(c.first_name, c.last_name)
    WHEN s.party_kind = 'account' AND a.id IS NOT NULL THEN NULLIF(btrim(a.name), '')
    WHEN s.party_kind = 'contact' THEN pg_temp.person_display(s.match_name)
    ELSE NULLIF(btrim(s.match_name), '')
  END AS party_name,
  (a.is_example IS TRUE) AS account_is_example,
  gen_random_uuid() AS event_id
FROM ff_pc_scope s
LEFT JOIN ff_pc_name_contact nc ON nc.policy_id = s.id
LEFT JOIN ff_pc_name_account na ON na.policy_id = s.id
LEFT JOIN ff_pc_name_legal nl ON nl.policy_id = s.id
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN s.party_kind = 'contact' AND s.contact_id IS NOT NULL THEN 'policy_fk'
      WHEN s.party_kind = 'account' AND s.account_id IS NOT NULL THEN 'policy_fk'
      WHEN s.party_kind = 'contact' AND s.deal_contact_id IS NOT NULL THEN 'deal_fk'
      WHEN s.party_kind = 'account' AND s.deal_account_id IS NOT NULL THEN 'deal_fk'
      WHEN s.party_kind = 'contact' AND COALESCE(nc.hits, 0) = 1 THEN 'name_match'
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) = 1 THEN 'name_match'
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) = 0 AND COALESCE(nl.hits, 0) = 1 THEN 'name_match'
      WHEN s.party_kind = 'contact' AND COALESCE(nc.hits, 0) > 1 THEN 'ambiguous'
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) > 1 THEN 'ambiguous'
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) = 0 AND COALESCE(nl.hits, 0) > 1 THEN 'ambiguous'
      WHEN s.match_name IS NULL THEN 'no_name'
      ELSE 'unmatched'
    END AS link_status,
    CASE
      WHEN s.party_kind = 'contact' AND s.contact_id IS NOT NULL THEN s.contact_id
      WHEN s.party_kind = 'contact' AND s.deal_contact_id IS NOT NULL THEN s.deal_contact_id
      WHEN s.party_kind = 'contact' AND COALESCE(nc.hits, 0) = 1 THEN nc.contact_id
      ELSE NULL
    END AS resolved_contact_id,
    CASE
      WHEN s.party_kind = 'account' AND s.account_id IS NOT NULL THEN s.account_id
      WHEN s.party_kind = 'account' AND s.deal_account_id IS NOT NULL THEN s.deal_account_id
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) = 1 THEN na.account_id
      WHEN s.party_kind = 'account' AND COALESCE(na.hits, 0) = 0 AND COALESCE(nl.hits, 0) = 1 THEN nl.account_id
      ELSE NULL
    END AS resolved_account_id,
    CASE
      WHEN s.party_kind = 'contact' THEN COALESCE(nc.hits, 0)
      WHEN COALESCE(na.hits, 0) > 0 THEN na.hits
      ELSE COALESCE(nl.hits, 0)
    END AS name_hits
) link
LEFT JOIN contacts c
  ON c.id = link.resolved_contact_id
 AND c.tenant_id = s.tenant_id
LEFT JOIN accounts a
  ON a.id = link.resolved_account_id
 AND a.tenant_id = s.tenant_id;

-- Example accounts are not a source. Keep the existing FK; copy nothing from them.
UPDATE ff_pc_resolved
SET link_status = 'example_account'
WHERE account_is_example
  AND party_kind = 'account';

CREATE INDEX ON ff_pc_resolved (policy_id);

-- Address chosen for insured location. One source, never mixed.
-- location_id wins for every P&C line: the policy already points at that row.
-- Else residence contact street (contacts.mailing_address is the insured street).
-- Else commercial business address (primary_*, or mailing when mailing_same_as_primary).
-- Landlord, flood, unspecified HO, auto, RV/boat, umbrella: no party-address copy.
CREATE TEMP TABLE ff_pc_address AS
SELECT
  r.policy_id,
  src.address_source,
  NULLIF(btrim(src.street), '') AS street,
  NULLIF(btrim(src.city), '') AS city,
  NULLIF(btrim(src.state), '') AS state,
  NULLIF(btrim(src.zip), '') AS zip,
  src.aligned
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
LEFT JOIN locations loc
  ON loc.id = r.location_id
 AND loc.tenant_id = r.tenant_id
LEFT JOIN contacts c
  ON c.id = r.resolved_contact_id
 AND c.tenant_id = r.tenant_id
LEFT JOIN accounts a
  ON a.id = r.resolved_account_id
 AND a.tenant_id = r.tenant_id
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN r.link_status = 'example_account' THEN NULL
      WHEN r.location_id IS NOT NULL THEN 'linked_location'
      WHEN r.line_class = 'residence'
       AND r.link_status IN ('policy_fk', 'deal_fk', 'name_match')
       AND r.resolved_contact_id IS NOT NULL
        THEN 'contact_street'
      WHEN r.party_kind = 'account'
       AND r.line_class IN ('commercial_auto', 'commercial_property', 'commercial_other')
       AND r.link_status IN ('policy_fk', 'deal_fk', 'name_match')
       AND r.resolved_account_id IS NOT NULL
       AND NOT r.account_is_example
        THEN 'account_address'
      ELSE NULL
    END AS address_source
) chosen
CROSS JOIN LATERAL (
  SELECT
    chosen.address_source,
    CASE chosen.address_source
      WHEN 'linked_location' THEN COALESCE(NULLIF(btrim(loc.address1), ''), NULLIF(btrim(loc.street), ''))
      WHEN 'contact_street' THEN c.mailing_address
      WHEN 'account_address' THEN
        CASE
          WHEN NOT pg_temp.is_blank(a.primary_address1)
            OR NOT pg_temp.is_blank(a.primary_city)
            OR NOT pg_temp.is_blank(a.primary_state)
            OR NOT pg_temp.is_blank(a.primary_zip)
            THEN a.primary_address1
          WHEN a.mailing_same_as_primary THEN a.mailing_address
          ELSE NULL
        END
      ELSE NULL
    END AS street,
    CASE chosen.address_source
      WHEN 'linked_location' THEN loc.city
      WHEN 'contact_street' THEN c.city
      WHEN 'account_address' THEN
        CASE
          WHEN NOT pg_temp.is_blank(a.primary_address1)
            OR NOT pg_temp.is_blank(a.primary_city)
            OR NOT pg_temp.is_blank(a.primary_state)
            OR NOT pg_temp.is_blank(a.primary_zip)
            THEN a.primary_city
          WHEN a.mailing_same_as_primary THEN a.city
          ELSE NULL
        END
      ELSE NULL
    END AS city,
    CASE chosen.address_source
      WHEN 'linked_location' THEN loc.state
      WHEN 'contact_street' THEN c.state
      WHEN 'account_address' THEN
        CASE
          WHEN NOT pg_temp.is_blank(a.primary_address1)
            OR NOT pg_temp.is_blank(a.primary_city)
            OR NOT pg_temp.is_blank(a.primary_state)
            OR NOT pg_temp.is_blank(a.primary_zip)
            THEN a.primary_state
          WHEN a.mailing_same_as_primary THEN a.state
          ELSE NULL
        END
      ELSE NULL
    END AS state,
    CASE chosen.address_source
      WHEN 'linked_location' THEN loc.zip
      WHEN 'contact_street' THEN c.zip
      WHEN 'account_address' THEN
        CASE
          WHEN NOT pg_temp.is_blank(a.primary_address1)
            OR NOT pg_temp.is_blank(a.primary_city)
            OR NOT pg_temp.is_blank(a.primary_state)
            OR NOT pg_temp.is_blank(a.primary_zip)
            THEN a.primary_zip
          WHEN a.mailing_same_as_primary THEN a.zip
          ELSE NULL
        END
      ELSE NULL
    END AS zip,
    true AS aligned
) raw
CROSS JOIN LATERAL (
  SELECT
    raw.address_source,
    raw.street,
    raw.city,
    raw.state,
    raw.zip,
    (
      raw.address_source IS NOT NULL
      AND (pg_temp.is_blank(p.premises_address) OR pg_temp.is_blank(raw.street) OR pg_temp.same_text(p.premises_address, raw.street))
      AND (pg_temp.is_blank(p.premises_city) OR pg_temp.is_blank(raw.city) OR pg_temp.same_text(p.premises_city, raw.city))
      AND (pg_temp.is_blank(p.premises_state) OR pg_temp.is_blank(raw.state) OR upper(btrim(p.premises_state)) = upper(btrim(raw.state)))
      AND (
        pg_temp.is_blank(p.premises_zip)
        OR pg_temp.is_blank(raw.zip)
        OR pg_temp.zip5(p.premises_zip) IS NOT DISTINCT FROM pg_temp.zip5(raw.zip)
      )
    ) AS aligned
) src;

CREATE TEMP TABLE ff_pc_fills (
  policy_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  policy_number text NOT NULL,
  party_name text,
  field_key text NOT NULL,
  field_label text NOT NULL,
  log_key text NOT NULL,
  new_value text NOT NULL,
  target text NOT NULL,
  target_id uuid,
  event_id uuid NOT NULL
);

-- Blank party foreign key, only when this script resolved exactly one party.
INSERT INTO ff_pc_fills (
  policy_id, tenant_id, policy_number, party_name, field_key, field_label, log_key,
  new_value, target, target_id, event_id
)
SELECT
  r.policy_id, r.tenant_id, r.policy_number, r.party_name,
  'contact_id', 'Contact', 'contactId',
  r.resolved_contact_id::text, 'policies.contact_id', NULL, r.event_id
FROM ff_pc_resolved r
WHERE r.party_kind = 'contact'
  AND r.policy_contact_id IS NULL
  AND r.resolved_contact_id IS NOT NULL
  AND r.link_status IN ('deal_fk', 'name_match');

INSERT INTO ff_pc_fills (
  policy_id, tenant_id, policy_number, party_name, field_key, field_label, log_key,
  new_value, target, target_id, event_id
)
SELECT
  r.policy_id, r.tenant_id, r.policy_number, r.party_name,
  'account_id', 'Account', 'accountId',
  r.resolved_account_id::text, 'policies.account_id', NULL, r.event_id
FROM ff_pc_resolved r
WHERE r.party_kind = 'account'
  AND r.policy_account_id IS NULL
  AND r.resolved_account_id IS NOT NULL
  AND r.link_status IN ('deal_fk', 'name_match')
  AND NOT r.account_is_example;

INSERT INTO ff_pc_fills (
  policy_id, tenant_id, policy_number, party_name, field_key, field_label, log_key,
  new_value, target, target_id, event_id
)
SELECT
  r.policy_id, r.tenant_id, r.policy_number, r.party_name,
  v.field_key, v.field_label, v.log_key,
  btrim(v.new_value), 'policies.' || v.field_key, NULL, r.event_id
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
JOIN ff_pc_address addr ON addr.policy_id = r.policy_id
CROSS JOIN LATERAL (
  VALUES
    ('premises_address', 'Insured location', 'premisesAddress', p.premises_address, addr.street),
    ('premises_city', 'Insured city', 'premisesCity', p.premises_city, addr.city),
    ('premises_state', 'Insured state', 'premisesState', p.premises_state, addr.state),
    ('premises_zip', 'Insured ZIP', 'premisesZip', p.premises_zip, addr.zip)
) AS v(field_key, field_label, log_key, current_value, new_value)
WHERE addr.aligned
  AND addr.address_source IS NOT NULL
  AND pg_temp.is_blank(v.current_value)
  AND NOT pg_temp.is_blank(v.new_value);

-- Custom policy fields that already exist on the policy module.
-- Same key, same fact. No new catalog rows.
CREATE TEMP TABLE ff_pc_custom_map (
  party_kind text NOT NULL,
  field_key text NOT NULL,
  field_label text NOT NULL,
  source_kind text NOT NULL,
  source_key text NOT NULL
);

INSERT INTO ff_pc_custom_map (party_kind, field_key, field_label, source_kind, source_key)
VALUES
  ('contact', 'phone', 'Phone', 'column', 'phone'),
  ('contact', 'email', 'Email', 'column', 'email'),
  ('contact', 'secondary_phone', 'Secondary phone', 'column', 'secondary_phone'),
  ('contact', 'date_of_birth', 'Date of birth', 'column', 'date_of_birth'),
  ('contact', 'dob', 'Date of birth', 'column', 'date_of_birth'),
  ('contact', 'named_insured', 'Named insured', 'expr', 'named_insured'),
  ('contact', 'insured_name', 'Named insured', 'expr', 'named_insured'),
  ('contact', 'primary_named_insured', 'Named insured', 'expr', 'named_insured'),
  ('contact', 'mailing_address', 'Insured street', 'column', 'mailing_address'),
  ('contact', 'city', 'City', 'column', 'city'),
  ('contact', 'state', 'State', 'column', 'state'),
  ('contact', 'zip', 'ZIP', 'column', 'zip'),
  ('contact', 'contact_mailing_address', 'Mailing address', 'custom', 'contact_mailing_address'),
  ('contact', 'contact_mailing_city', 'Mailing city', 'custom', 'contact_mailing_city'),
  ('contact', 'contact_mailing_state', 'Mailing state', 'custom', 'contact_mailing_state'),
  ('contact', 'contact_mailing_zip', 'Mailing ZIP', 'custom', 'contact_mailing_zip'),
  ('account', 'phone', 'Phone', 'column', 'phone'),
  ('account', 'email', 'Email', 'column', 'email'),
  ('account', 'business_name', 'Business name', 'column', 'name'),
  ('account', 'legal_name', 'Legal name', 'column', 'legal_name'),
  ('account', 'dba', 'DBA', 'column', 'dba'),
  ('account', 'named_insured', 'Named insured', 'column', 'name'),
  ('account', 'insured_name', 'Named insured', 'column', 'name'),
  ('account', 'ein', 'FEIN', 'fein', 'ein'),
  ('account', 'fein', 'FEIN', 'fein', 'ein'),
  ('account', 'entity_type', 'Entity type', 'column', 'entity_type'),
  ('account', 'mailing_address', 'Mailing address', 'column', 'mailing_address'),
  ('account', 'city', 'City', 'column', 'city'),
  ('account', 'state', 'State', 'column', 'state'),
  ('account', 'zip', 'ZIP', 'column', 'zip'),
  ('account', 'primary_address1', 'Business address', 'column', 'primary_address1'),
  ('account', 'business_address', 'Business address', 'column', 'primary_address1'),
  ('account', 'primary_address', 'Business address', 'column', 'primary_address1'),
  ('account', 'primary_city', 'Business city', 'column', 'primary_city'),
  ('account', 'primary_state', 'Business state', 'column', 'primary_state'),
  ('account', 'primary_zip', 'Business ZIP', 'column', 'primary_zip'),
  ('account', 'website', 'Website', 'column', 'website');

INSERT INTO ff_pc_fills (
  policy_id, tenant_id, policy_number, party_name, field_key, field_label, log_key,
  new_value, target, target_id, event_id
)
SELECT
  r.policy_id, r.tenant_id, r.policy_number, r.party_name,
  m.field_key, m.field_label, m.field_key,
  btrim(src.source_value), 'custom', NULL, r.event_id
FROM ff_pc_resolved r
JOIN ff_pc_custom_map m ON m.party_kind = r.party_kind
LEFT JOIN contacts c
  ON c.id = r.resolved_contact_id
 AND c.tenant_id = r.tenant_id
LEFT JOIN accounts a
  ON a.id = r.resolved_account_id
 AND a.tenant_id = r.tenant_id
LEFT JOIN desk_custom_field_values party_custom
  ON party_custom.tenant_id = r.tenant_id
 AND party_custom.module = 'contacts'
 AND party_custom.record_id = r.resolved_contact_id
 AND party_custom.field_key = m.source_key
 AND m.source_kind = 'custom'
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN r.link_status NOT IN ('policy_fk', 'deal_fk', 'name_match') THEN NULL
    WHEN r.party_kind = 'account' AND r.account_is_example THEN NULL
    WHEN m.source_kind = 'expr' AND m.source_key = 'named_insured' AND r.party_kind = 'contact'
      THEN pg_temp.contact_display(c.first_name, c.last_name)
    WHEN m.source_kind = 'fein' THEN
      CASE
        WHEN btrim(coalesce(a.ein, '')) ~ '^[0-9]{2}-?[0-9]{7}$' THEN btrim(a.ein)
        ELSE NULL
      END
    WHEN m.source_kind = 'custom' THEN party_custom.value
    WHEN m.source_kind = 'column' AND r.party_kind = 'contact' THEN
      CASE m.source_key
        WHEN 'phone' THEN c.phone
        WHEN 'email' THEN c.email
        WHEN 'secondary_phone' THEN c.secondary_phone
        WHEN 'date_of_birth' THEN c.date_of_birth
        WHEN 'mailing_address' THEN c.mailing_address
        WHEN 'city' THEN c.city
        WHEN 'state' THEN c.state
        WHEN 'zip' THEN c.zip
        ELSE NULL
      END
    WHEN m.source_kind = 'column' AND r.party_kind = 'account' THEN
      CASE m.source_key
        WHEN 'phone' THEN a.phone
        WHEN 'email' THEN a.email
        WHEN 'name' THEN a.name
        WHEN 'legal_name' THEN a.legal_name
        WHEN 'dba' THEN a.dba
        WHEN 'entity_type' THEN a.entity_type
        WHEN 'mailing_address' THEN a.mailing_address
        WHEN 'city' THEN a.city
        WHEN 'state' THEN a.state
        WHEN 'zip' THEN a.zip
        WHEN 'primary_address1' THEN a.primary_address1
        WHEN 'primary_city' THEN a.primary_city
        WHEN 'primary_state' THEN a.primary_state
        WHEN 'primary_zip' THEN a.primary_zip
        WHEN 'website' THEN a.website
        ELSE NULL
      END
    ELSE NULL
  END AS source_value
) src
WHERE NOT pg_temp.is_blank(src.source_value)
  AND (
    EXISTS (
      SELECT 1
      FROM desk_custom_fields f
      WHERE f.tenant_id = r.tenant_id
        AND f.module = 'policies'
        AND f.key = m.field_key
    )
    OR EXISTS (
      SELECT 1
      FROM desk_custom_field_values v
      WHERE v.tenant_id = r.tenant_id
        AND v.module = 'policies'
        AND v.record_id = r.policy_id
        AND v.field_key = m.field_key
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM desk_custom_field_values v
    WHERE v.tenant_id = r.tenant_id
      AND v.module = 'policies'
      AND v.record_id = r.policy_id
      AND v.field_key = m.field_key
      AND NOT pg_temp.is_blank(v.value)
  );

-- Driver date of birth, only when that driver is the resolved contact.
INSERT INTO ff_pc_fills (
  policy_id, tenant_id, policy_number, party_name, field_key, field_label, log_key,
  new_value, target, target_id, event_id
)
SELECT
  r.policy_id, r.tenant_id, r.policy_number, r.party_name,
  'driver_date_of_birth', 'Date of birth', 'driverDateOfBirth',
  btrim(c.date_of_birth), 'drivers.date_of_birth', d.id, r.event_id
FROM ff_pc_resolved r
JOIN contacts c
  ON c.id = r.resolved_contact_id
 AND c.tenant_id = r.tenant_id
JOIN drivers d
  ON d.policy_id = r.policy_id
 AND d.tenant_id = r.tenant_id
WHERE r.party_kind = 'contact'
  AND r.link_status IN ('policy_fk', 'deal_fk', 'name_match')
  AND NOT pg_temp.is_blank(c.date_of_birth)
  AND pg_temp.is_blank(d.date_of_birth)
  AND (
    d.contact_id = r.resolved_contact_id
    OR (
      d.contact_id IS NULL
      AND pg_temp.norm_person(concat_ws(' ', d.first_name, d.last_name))
        = pg_temp.norm_person(concat_ws(' ', c.first_name, c.last_name))
    )
  );

CREATE INDEX ON ff_pc_fills (policy_id, field_key);

-- Commission must never appear here.
DELETE FROM ff_pc_fills
WHERE field_key ~* 'commission';

CREATE TEMP TABLE ff_pc_flags (
  policy_id uuid NOT NULL,
  policy_number text NOT NULL,
  party_name text,
  field text NOT NULL,
  field_key text NOT NULL,
  reason text
);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id,
  r.policy_number,
  r.party_name,
  'Contact link',
  'party_link',
  CASE r.link_status
    WHEN 'ambiguous' THEN 'ambiguous — ' || r.name_hits || ' contacts share that insured name'
    WHEN 'unmatched' THEN 'unmatched — no contact with that insured name'
    WHEN 'no_name' THEN 'no insured name on the policy or its deal'
    ELSE r.link_status
  END
FROM ff_pc_resolved r
WHERE r.party_kind = 'contact'
  AND r.link_status IN ('ambiguous', 'unmatched', 'no_name');

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id,
  r.policy_number,
  r.party_name,
  'Account link',
  'party_link',
  CASE r.link_status
    WHEN 'ambiguous' THEN 'ambiguous — ' || r.name_hits || ' accounts share that name'
    WHEN 'unmatched' THEN 'unmatched — no account with that name'
    WHEN 'no_name' THEN 'no insured name on the policy or its deal'
    WHEN 'example_account' THEN 'linked account is an example record — nothing copied'
    ELSE r.link_status
  END
FROM ff_pc_resolved r
WHERE r.party_kind = 'account'
  AND r.link_status IN ('ambiguous', 'unmatched', 'no_name', 'example_account');

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  v.field, v.field_key,
  CASE
    WHEN addr.address_source = 'linked_location'
      THEN 'linked location is missing this part'
    WHEN addr.address_source IS NOT NULL AND NOT addr.aligned
      THEN 'source address disagrees with a premises part already on the policy — not copied'
    WHEN r.line_class = 'dwelling_landlord'
      THEN 'landlord/DP location is not the contact street — not copied'
    WHEN r.line_class = 'flood'
      THEN 'flood location is not assumed to be the contact street — not copied'
    WHEN r.line_class = 'ho_unspecified'
      THEN 'HO line has no form — contact street was not copied'
    WHEN r.link_status NOT IN ('policy_fk', 'deal_fk', 'name_match')
      THEN 'no confident party link'
    WHEN addr.address_source IS NULL
      THEN 'no one-to-one address on the linked party'
    ELSE 'source address has no ' || lower(v.field)
  END
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
LEFT JOIN ff_pc_address addr ON addr.policy_id = r.policy_id
CROSS JOIN LATERAL (
  VALUES
    ('Insured location', 'premises_address', p.premises_address),
    ('Insured city', 'premises_city', p.premises_city),
    ('Insured state', 'premises_state', p.premises_state),
    ('Insured ZIP', 'premises_zip', p.premises_zip)
) AS v(field, field_key, current_value)
WHERE pg_temp.is_blank(v.current_value)
  AND NOT EXISTS (
    SELECT 1 FROM ff_pc_fills f
    WHERE f.policy_id = r.policy_id AND f.field_key = v.field_key
  )
  AND (
    r.location_id IS NOT NULL
    OR r.line_class IN (
      'residence', 'dwelling_landlord', 'flood', 'ho_unspecified',
      'commercial_auto', 'commercial_property', 'commercial_other'
    )
  );

-- Excluded policy facts. Flagged when blank. Never filled. Commission is omitted.
INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT r.policy_id, r.policy_number, r.party_name, v.field, v.field_key, 'not on the contact or account'
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
CROSS JOIN LATERAL (
  VALUES
    ('Premium', 'premium', CASE WHEN p.premium IS NULL THEN NULL ELSE p.premium::text END),
    ('Carrier', 'carrier', CASE WHEN p.carrier_id IS NULL THEN NULL ELSE 'set' END),
    ('Policy number', 'policy_number', p.policy_number),
    ('Effective date', 'effective_date', CASE WHEN p.effective_date IS NULL THEN NULL ELSE 'set' END),
    ('Expiration date', 'expiration_date', CASE WHEN p.expiration_date IS NULL THEN NULL ELSE 'set' END),
    ('Status', 'status', p.status),
    ('Renewal date', 'renewal_date', CASE WHEN p.renewal_date IS NULL THEN NULL ELSE 'set' END)
) AS v(field, field_key, current_value)
WHERE pg_temp.is_blank(v.current_value);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT r.policy_id, r.policy_number, r.party_name, 'Coverage limits', 'coverage_limits', 'not on the contact or account'
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
WHERE p.coverage_limits IS NULL
   OR jsonb_typeof(p.coverage_limits) <> 'object'
   OR NOT EXISTS (
     SELECT 1
     FROM jsonb_each_text(
       CASE
         WHEN jsonb_typeof(p.coverage_limits) = 'object' THEN p.coverage_limits
         ELSE '{}'::jsonb
       END
     ) entry
     WHERE NOT pg_temp.is_blank(entry.value)
   );

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT r.policy_id, r.policy_number, r.party_name, 'Coverage A', 'coverage_a', 'not on the contact or account'
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
WHERE p.coverage_a IS NULL
  AND r.line_class IN ('residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property');

-- One risk: the policy risk, else the only risk on the deal.
CREATE TEMP TABLE ff_pc_risk AS
SELECT r.policy_id, k.id AS risk_id
FROM ff_pc_resolved r
JOIN risks k ON k.id = r.risk_id AND k.tenant_id = r.tenant_id
UNION ALL
SELECT r.policy_id, min(k.id::text)::uuid
FROM ff_pc_resolved r
JOIN risks k ON k.deal_id = r.deal_id AND k.tenant_id = r.tenant_id
WHERE r.risk_id IS NULL
  AND r.deal_id IS NOT NULL
GROUP BY r.policy_id
HAVING count(*) = 1;

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  'Construction', 'construction',
  'more than one risk on the deal and the policy has no risk link'
FROM ff_pc_resolved r
WHERE r.line_class IN ('residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property')
  AND r.risk_id IS NULL
  AND r.deal_id IS NOT NULL
  AND (
    SELECT count(*)
    FROM risks k
    WHERE k.deal_id = r.deal_id
      AND k.tenant_id = r.tenant_id
  ) > 1;

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  v.field, v.field_key, 'not on the contact or account'
FROM ff_pc_resolved r
JOIN ff_pc_risk pr ON pr.policy_id = r.policy_id
JOIN risks k ON k.id = pr.risk_id
CROSS JOIN LATERAL (
  VALUES
    ('Year built', 'year_built', CASE WHEN k.year_built IS NULL THEN NULL ELSE k.year_built::text END),
    ('Construction', 'construction', k.construction),
    ('Roof year', 'roof_year', CASE WHEN k.roof_year IS NULL THEN NULL ELSE k.roof_year::text END),
    ('Roof covering', 'roof_covering', k.roof_covering),
    ('Square feet', 'square_feet', CASE WHEN k.square_feet IS NULL THEN NULL ELSE k.square_feet::text END),
    ('Stories', 'stories', CASE WHEN k.stories IS NULL THEN NULL ELSE k.stories::text END)
) AS v(field, field_key, current_value)
WHERE r.line_class IN ('residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property')
  AND pg_temp.is_blank(v.current_value);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  'VIN', 'vin:' || veh.id::text,
  'vehicle ' || COALESCE(veh.year::text || ' ', '') || COALESCE(veh.make || ' ', '') || COALESCE(veh.model, '') ||
    CASE WHEN btrim(COALESCE(veh.year::text, '') || COALESCE(veh.make, '') || COALESCE(veh.model, '')) = ''
      THEN 'sort ' || veh.sort_order::text
      ELSE ''
    END
FROM ff_pc_resolved r
JOIN vehicles veh ON veh.policy_id = r.policy_id AND veh.tenant_id = r.tenant_id
WHERE r.line_class IN ('auto', 'commercial_auto', 'recreational')
  AND pg_temp.is_blank(veh.vin);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  'VIN', 'risk_vin', 'risk row has no VIN and the policy has no vehicle'
FROM ff_pc_resolved r
JOIN ff_pc_risk pr ON pr.policy_id = r.policy_id
JOIN risks k ON k.id = pr.risk_id
WHERE r.line_class IN ('auto', 'commercial_auto', 'recreational')
  AND pg_temp.is_blank(k.vin)
  AND NOT EXISTS (
    SELECT 1 FROM vehicles veh
    WHERE veh.policy_id = r.policy_id AND veh.tenant_id = r.tenant_id
  );

CREATE TEMP TABLE ff_pc_terms AS
SELECT t.*
FROM policy_terms t
JOIN ff_pc_resolved r ON r.policy_id = t.policy_id
WHERE t.role = 'current'
UNION ALL
SELECT picked.*
FROM (
  SELECT DISTINCT ON (t.policy_id) t.*
  FROM policy_terms t
  JOIN ff_pc_resolved r ON r.policy_id = t.policy_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM policy_terms cur
    WHERE cur.policy_id = t.policy_id
      AND cur.role = 'current'
  )
  ORDER BY t.policy_id, t.term_expiration DESC NULLS LAST
) picked;

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  v.field, v.field_key || ':' || t.id::text,
  'term role ' || COALESCE(NULLIF(btrim(t.role), ''), 'unknown')
FROM ff_pc_resolved r
JOIN ff_pc_terms t ON t.policy_id = r.policy_id
CROSS JOIN LATERAL (
  VALUES
    ('AOP deductible', 'aop_deductible', t.aop_deductible, r.line_class IN ('residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property', 'commercial_other')),
    ('Hurricane deductible', 'hurricane_deductible', t.hurricane_deductible, r.line_class IN ('residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property')),
    ('Comprehensive deductible', 'comprehensive_deductible', t.comprehensive_deductible, r.line_class IN ('auto', 'commercial_auto', 'recreational')),
    ('Collision deductible', 'collision_deductible', t.collision_deductible, r.line_class IN ('auto', 'commercial_auto', 'recreational'))
) AS v(field, field_key, current_value, applies)
WHERE v.applies
  AND pg_temp.is_blank(v.current_value);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  'Deductibles', 'deductibles', 'no policy term on file'
FROM ff_pc_resolved r
WHERE r.line_class IN (
  'residence', 'dwelling_landlord', 'flood', 'ho_unspecified', 'commercial_property',
  'commercial_other', 'auto', 'commercial_auto', 'recreational'
)
AND NOT EXISTS (
  SELECT 1 FROM policy_terms t WHERE t.policy_id = r.policy_id
);

INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id, r.policy_number, r.party_name,
  'Date of birth',
  'driver_date_of_birth:' || d.id::text,
  'driver ' || pg_temp.contact_display(d.first_name, d.last_name) ||
    CASE
      WHEN r.party_kind = 'contact'
       AND r.link_status IN ('policy_fk', 'deal_fk', 'name_match')
       AND (
         d.contact_id = r.resolved_contact_id
         OR (
           d.contact_id IS NULL
           AND pg_temp.norm_person(concat_ws(' ', d.first_name, d.last_name))
             = pg_temp.norm_person(concat_ws(' ', c.first_name, c.last_name))
         )
       )
        THEN ' — linked contact has no date of birth'
      ELSE ' — not the linked contact'
    END
FROM ff_pc_resolved r
JOIN drivers d ON d.policy_id = r.policy_id AND d.tenant_id = r.tenant_id
LEFT JOIN contacts c ON c.id = r.resolved_contact_id AND c.tenant_id = r.tenant_id
WHERE pg_temp.is_blank(d.date_of_birth)
  AND NOT EXISTS (
    SELECT 1 FROM ff_pc_fills f
    WHERE f.target = 'drivers.date_of_birth' AND f.target_id = d.id
  );

-- Layout fields that stay blank and were not already flagged or filled.
INSERT INTO ff_pc_flags (policy_id, policy_number, party_name, field, field_key, reason)
SELECT
  r.policy_id,
  r.policy_number,
  r.party_name,
  COALESCE(
    def.label,
    CASE keys.field_key
      WHEN 'policy_number' THEN 'Policy number'
      WHEN 'status' THEN 'Status'
      WHEN 'premium' THEN 'Premium'
      WHEN 'effective_date' THEN 'Effective date'
      WHEN 'expiration_date' THEN 'Expiration date'
      WHEN 'renewal_date' THEN 'Renewal date'
      WHEN 'carrier' THEN 'Carrier'
      WHEN 'coverage_a' THEN 'Coverage A'
      WHEN 'line_of_business' THEN 'Line of business'
      WHEN 'policy_sub_type' THEN 'Policy sub-type'
      WHEN 'form_type' THEN 'Form'
      WHEN 'selling_agency' THEN 'Selling agency'
      WHEN 'billing_frequency' THEN 'Billing frequency'
      WHEN 'premises_address' THEN 'Insured location'
      WHEN 'premises_city' THEN 'Insured city'
      WHEN 'premises_state' THEN 'Insured state'
      WHEN 'premises_zip' THEN 'Insured ZIP'
      ELSE keys.field_key
    END
  ),
  'layout:' || keys.field_key,
  CASE
    WHEN keys.field_key ~* 'commission' THEN NULL
    WHEN mapped.field_key IS NOT NULL AND r.link_status NOT IN ('policy_fk', 'deal_fk', 'name_match')
      THEN 'mapped field, no confident party link'
    WHEN mapped.field_key IS NOT NULL THEN 'mapped field, source is blank'
    ELSE 'no one-to-one source on the contact or account'
  END
FROM ff_pc_resolved r
JOIN LATERAL (
  SELECT l.columns
  FROM desk_field_layouts l
  WHERE l.tenant_id = r.tenant_id
    AND l.module = 'policies'
    AND upper(btrim(l.line_of_business)) IN (upper(btrim(r.line_of_business)), 'ALL')
  ORDER BY CASE
    WHEN upper(btrim(l.line_of_business)) = upper(btrim(r.line_of_business)) THEN 0
    ELSE 1
  END
  LIMIT 1
) layout ON true
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN jsonb_typeof(layout.columns -> 'columns') = 'array' THEN layout.columns -> 'columns'
    WHEN jsonb_typeof(layout.columns) = 'array' THEN layout.columns
    ELSE '[]'::jsonb
  END AS cols
) shape
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(shape.cols) = 'array' THEN shape.cols ELSE '[]'::jsonb END
) AS col
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(col -> 'sections') = 'array' THEN col -> 'sections'
    ELSE '[]'::jsonb
  END
) AS sec
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(sec -> 'fieldKeys') = 'array' THEN sec -> 'fieldKeys'
    ELSE '[]'::jsonb
  END
) AS keys(field_key)
LEFT JOIN ff_pc_custom_map mapped
  ON mapped.party_kind = r.party_kind
 AND mapped.field_key = keys.field_key
LEFT JOIN desk_custom_fields def
  ON def.tenant_id = r.tenant_id
 AND def.module = 'policies'
 AND def.key = keys.field_key
LEFT JOIN policies p ON p.id = r.policy_id
LEFT JOIN desk_custom_field_values stored
  ON stored.tenant_id = r.tenant_id
 AND stored.module = 'policies'
 AND stored.record_id = r.policy_id
 AND stored.field_key = keys.field_key
CROSS JOIN LATERAL (
  SELECT CASE keys.field_key
    WHEN 'policy_number' THEN p.policy_number
    WHEN 'status' THEN p.status
    WHEN 'premium' THEN CASE WHEN p.premium IS NULL THEN NULL ELSE p.premium::text END
    WHEN 'effective_date' THEN CASE WHEN p.effective_date IS NULL THEN NULL ELSE 'set' END
    WHEN 'expiration_date' THEN CASE WHEN p.expiration_date IS NULL THEN NULL ELSE 'set' END
    WHEN 'renewal_date' THEN CASE WHEN p.renewal_date IS NULL THEN NULL ELSE 'set' END
    WHEN 'carrier' THEN CASE WHEN p.carrier_id IS NULL THEN NULL ELSE 'set' END
    WHEN 'coverage_a' THEN CASE WHEN p.coverage_a IS NULL THEN NULL ELSE p.coverage_a::text END
    WHEN 'line_of_business' THEN p.line_of_business
    WHEN 'policy_sub_type' THEN p.policy_sub_type
    WHEN 'form_type' THEN p.form_type
    WHEN 'selling_agency' THEN p.selling_agency
    WHEN 'billing_frequency' THEN p.billing_frequency
    WHEN 'premises_address' THEN p.premises_address
    WHEN 'premises_city' THEN p.premises_city
    WHEN 'premises_state' THEN p.premises_state
    WHEN 'premises_zip' THEN p.premises_zip
    ELSE stored.value
  END AS current_value
) cur
WHERE keys.field_key !~* 'commission'
  AND pg_temp.is_blank(cur.current_value)
  AND NOT EXISTS (
    SELECT 1 FROM ff_pc_fills f
    WHERE f.policy_id = r.policy_id
      AND f.field_key = keys.field_key
  )
  AND NOT EXISTS (
    SELECT 1 FROM ff_pc_flags g
    WHERE g.policy_id = r.policy_id
      AND g.field_key = keys.field_key
  );

CREATE INDEX ON ff_pc_flags (policy_id);
