-- Trident Reciprocal Exchange HO-3 QRG 06122026: enrich appetite beyond min Cov A $300k.
-- Idempotent: reuse existing Trident UUID / aliases; never insert a duplicate name.
-- Does not modify 0123/0124. Captain applies this file on Neon after merge.
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333340';
  existing_id uuid;
  note text := $qrg$NOW COVERING WIND DRIVEN RAIN. FL HO-3 via QuoteRUSH (www.tridentreciprocal.com). Contact (877)368-9144 / support@tridentreciprocal.com. Coverage A $300,000-$5,000,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k. Cov B 2/5/10/15% (excl avail); Cov C 25/50/75% (excl avail); Cov D 10% of A; Liability 100/300/400/500k; Med Pay 2/3/4/5k. Deductibles: AOP 1k/2.5k/5k/10k; Hurricane 2/5/10% of A. Eligibility: dwelling 40 yrs & newer; roof Shingle 15 / Tile 20 / Metal 30; flat over living ineligible; flat reinforced concrete requires Cov A $900k+. PC10 ineligible; PC9 UW review. Distance to coast 1/2 mile or greater. Lapse +14 days requires UW review. HWH 15 yrs & newer if inside living (no age if garage/outside). Polybutylene ineligible; PEX no age. Electrical: no Challenger, Sylvania, Zinsco, or single-strand aluminum; multi-strand aluminum UW review. Loss history: <=2 non-hurricane claims in last 5 years, each <=$5k (exceptions available). Discounts: monitored burglar & fire alarm; wind loss mitigation; gated/limited access; HVAC maintenance contract. Enhancements: Ord/Law 10/25/50%; water backup & sump; screen enclosure; animal liability. QRG Version 06122026.$qrg$;
  qrg_row jsonb;
  hard jsonb := '["state!=FL","mobile_home","min_cov_a:300000","max_cov_a:5000000","max_dwelling_age:40","min_miles_to_coast:0.5","pc:10"]'::jsonb;
  soft jsonb := '["older_roof","pc:9"]'::jsonb;
  pref jsonb := '["fl_single_family","quoterush","wind_mitigation","newer_construction"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_row := jsonb_build_array(jsonb_build_object(
    'id', 'trident-ho3-min-cova-2026',
    'dateRequested', '2026-06-12',
    'lob', 'HO3',
    'roofAge', 'Shingle 15 / Tile 20 / Metal 30; flat over living ineligible',
    'waterHeater', '15 yrs & newer if inside living; no age if garage/outside',
    'hvac', 'HVAC maintenance contract discount',
    'electrical', 'No Challenger, Sylvania, Zinsco, or single-strand aluminum; multi-strand Al UW review',
    'claimsHistory', '<=2 non-hurricane claims in last 5 years; each <=$5k',
    'acceptDecline', 'accept',
    'notes', note
  ));

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(c.name) LIKE '%trident reciprocal%'
      OR lower(c.name) = 'trident'
    )
  ORDER BY
    CASE
      WHEN lower(c.name) LIKE '%trident reciprocal%' OR lower(c.name) = 'trident' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, portal_login, website,
      carrier_info, territory, preferred_submission, binding_authority,
      appetite_notes, appetite_rows, fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id,
      tenant,
      'Trident Reciprocal Exchange',
      '["HO"]'::jsonb,
      'open',
      'QuoteRUSH',
      'https://www.tridentreciprocal.com',
      'Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH. NOW COVERING WIND DRIVEN RAIN.',
      'Florida',
      'portal',
      'limited',
      note,
      qrg_row,
      'trident-ho3-2026-09',
      true,
      now(),
      now()
    );
    existing_id := seeded_id;
  ELSE
    UPDATE carriers
    SET
      name = CASE
        WHEN lower(trim(name)) IN ('trident', 'trident reciprocal') THEN 'Trident Reciprocal Exchange'
        ELSE name
      END,
      written_lines = CASE
        WHEN written_lines @> '["HO"]'::jsonb THEN written_lines
        ELSE coalesce(written_lines, '[]'::jsonb) || '["HO"]'::jsonb
      END,
      portal_status = coalesce(nullif(portal_status, ''), 'open'),
      portal_login = coalesce(nullif(portal_login, ''), 'QuoteRUSH'),
      website = coalesce(nullif(website, ''), 'https://www.tridentreciprocal.com'),
      carrier_info = CASE
        WHEN coalesce(carrier_info, '') = '' THEN 'Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH. NOW COVERING WIND DRIVEN RAIN.'
        WHEN carrier_info ILIKE '%WIND DRIVEN RAIN%' THEN carrier_info
        ELSE carrier_info || E'\nNOW COVERING WIND DRIVEN RAIN. QRG 06122026.'
      END,
      territory = coalesce(nullif(territory, ''), 'Florida'),
      preferred_submission = coalesce(nullif(preferred_submission, ''), 'portal'),
      appetite_notes = note,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' IS DISTINCT FROM 'trident-ho3-min-cova-2026'
        ) kept
      ) || qrg_row,
      active = true,
      updated_at = now()
    WHERE id = existing_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM appetite_rules
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO'
  ) THEN
    UPDATE appetite_rules
    SET
      min_cov_a = 300000,
      max_cov_a = 5000000,
      min_year_built = 1986,
      max_roof_age = 15,
      allowed_roof_coverings = '["shingle","tile","metal"]'::jsonb,
      coastal_allowed = true,
      min_miles_to_coast = 0.5,
      mobile_allowed = false,
      notes = note,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, min_cov_a, max_cov_a, min_year_built,
      max_roof_age, allowed_roof_coverings, coastal_allowed, min_miles_to_coast,
      mobile_allowed, requires_opening_protection, require_replacement_cost,
      notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', 300000, 5000000, 1986, 15,
      '["shingle","tile","metal"]'::jsonb, true, 0.5, false, false, false, note, now(), now()
    );
  END IF;

  IF to_regclass('public.carrier_appetite') IS NOT NULL THEN
    INSERT INTO carrier_appetite (
      tenant_id, carrier_id, legal_name, segment, lines_offered, lines_not_offered,
      states_available, states_restricted, states_raw, portal_name, cs_phone,
      rateable, hard_declines, soft_cautions, preferred_signals, cat_posture,
      notes_for_agent, quote_priority, fl_ho_order, needs_state_confirm,
      linked_carrier_id, created_at, updated_at
    ) VALUES (
      tenant,
      'trident_reciprocal',
      'Trident Reciprocal Exchange',
      'fl_property',
      '["HO3"]'::jsonb,
      '[]'::jsonb,
      '["FL"]'::jsonb,
      '[]'::jsonb,
      '["FL"]'::jsonb,
      'QuoteRUSH',
      '(877)368-9144',
      true,
      hard,
      soft,
      pref,
      'open',
      note,
      13,
      13,
      false,
      existing_id,
      now(),
      now()
    )
    ON CONFLICT (tenant_id, carrier_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      segment = EXCLUDED.segment,
      lines_offered = EXCLUDED.lines_offered,
      states_available = EXCLUDED.states_available,
      states_raw = EXCLUDED.states_raw,
      portal_name = EXCLUDED.portal_name,
      cs_phone = EXCLUDED.cs_phone,
      rateable = EXCLUDED.rateable,
      hard_declines = EXCLUDED.hard_declines,
      soft_cautions = EXCLUDED.soft_cautions,
      preferred_signals = EXCLUDED.preferred_signals,
      cat_posture = EXCLUDED.cat_posture,
      notes_for_agent = EXCLUDED.notes_for_agent,
      quote_priority = EXCLUDED.quote_priority,
      fl_ho_order = EXCLUDED.fl_ho_order,
      linked_carrier_id = EXCLUDED.linked_carrier_id,
      updated_at = now();
  END IF;
END $$;
