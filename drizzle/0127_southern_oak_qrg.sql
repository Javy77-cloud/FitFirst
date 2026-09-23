-- Southern Oak Premier HO/DP: Javy bulletin 2026-09-16 + QRG enrichment.
-- Idempotent: reuse the live Neon Southern Oak UUID / name; never insert a duplicate.
-- Does not modify 0123-0126. Captain applies this file on Neon after merge.
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '1a0bfaf1-9888-45b3-84ea-2425eff3d3c2';
  existing_id uuid;
  note text := $qrg$Javy bulletin 2026-09-16: Premier HO-3/HO-6 new rates effective 7/15/2026 (new and renewal — rates live). HO-3 TIV increased to $7.5 million. Age of home expanded to 1950 and newer. Full Water expanded in 52 counties (age of home 11-39). DP-3 Coverage A bind up to $1 million. Portal southernoak.com / soi.policyport.com. CS 1-877-900-3971. Underwriter contacts not yet provided. Premier QRG 02-2026: HO-3 Cov A min $75k (varies by county); listed max $2M with higher TIV per bulletin. HO-6 Cov A $35k-$150k. Roof in good condition; wood shingle, asbestos, elastomeric, Tesla/solar ineligible; 15yr+ roof UW review with 5+ years useful life. Electrical 150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, or cloth. Plumbing: no galvanized, polybutylene, or cast iron; PEX ineligible if installed before 2010. Water heater 15 years max. HVAC permanently installed. 4-point required on HO-3 over 30 years prior to bind. Risks over 40 years: Limited Water required; ACV/market value under 80% RCE ineligible. Full Water may be requested for ages 11-39 (52 counties per bulletin) with approved plumbing inspection. Loss history: one prior loss in last 5 years excluding Act of God; no liability losses; open claims ineligible. Owner-occupied; no business on premises. DP-3 QRG 02-2026: Cov A $70k-$1M (over $1M needs prior UW); PC10 only if 5 years or newer; not within 300 ft of commercial; 4-point over 30 years. HO-4 Golden Leaf QRG 08-2018 / 2019-0326: renters Cov C $10k-$150k; PC10 ineligible. Wind-Only QRG 07-2022: HW-2 Cov A $25k-$1M; wind-pool eligible area; roof 15+ needs Preferred Roof Cert. Flood endorsement available on all forms.$qrg$;
  qrg_rows jsonb;
  hard jsonb := '["mobile_home","max_cov_a:7500000","min_year_built:1950"]'::jsonb;
  soft jsonb := '["older_roof"]'::jsonb;
  pref jsonb := '["se_coastal_ho"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_rows := jsonb_build_array(
    jsonb_build_object(
      'id', 'southern-oak-ho3-ho6-premier-2026',
      'dateRequested', '2026-09-16',
      'lob', 'HO3/HO6',
      'roofAge', '15yr+ UW review with 5+ years useful life; wood/asbestos/elastomeric/Tesla-solar ineligible',
      'waterHeater', '15 years max',
      'hvac', 'Permanently installed primary heat/cool',
      'electrical', '150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, cloth',
      'claimsHistory', 'One prior loss in last 5 years (ex-Act of God); no liability; open claims ineligible',
      'acceptDecline', 'accept',
      'notes', note
    ),
    jsonb_build_object(
      'id', 'southern-oak-dp3-2026',
      'dateRequested', '2026-09-16',
      'lob', 'DP3',
      'roofAge', '15yr+ UW review with 5+ years useful life; wood/asbestos/elastomeric/Tesla-solar ineligible',
      'waterHeater', '15 years max',
      'hvac', 'Permanently installed primary heat/cool',
      'electrical', '150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, cloth',
      'claimsHistory', 'Two or more non-Act of God losses in last 3 years ineligible; no liability losses',
      'acceptDecline', 'accept',
      'notes', 'DP-3 Coverage A bind up to $1 million (bulletin 2026-09-16; QRG 02-2026 $70k-$1M, over $1M prior UW).'
    ),
    jsonb_build_object(
      'id', 'southern-oak-ho4-2019',
      'dateRequested', '2019-03-26',
      'lob', 'HO4',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'HO-4 Golden Leaf QRG 08-2018 / 2019-0326. Renters Cov C $10k-$150k. PC10 ineligible.'
    ),
    jsonb_build_object(
      'id', 'southern-oak-wind-2022',
      'dateRequested', '2022-07-01',
      'lob', 'WIND_ONLY',
      'roofAge', 'HW-2: 15yr+ needs Preferred Roof Cert + UW review before submit',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', 'Prior losses: all damage repaired; UW may require proof',
      'acceptDecline', 'accept',
      'notes', 'Wind-Only QRG 07-2022. HW-2 Cov A $25k-$1M. Wind-pool eligible area. Flood endorsement available.'
    )
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(c.name) LIKE '%southern oak%'
    )
  ORDER BY
    CASE
      WHEN lower(c.name) LIKE '%southern oak%' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, portal_login, website,
      agent_portal_url, customer_service_phone, claims_phone, carrier_info,
      territory, preferred_submission, binding_authority,
      appetite_notes, appetite_rows, fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id,
      tenant,
      'Southern Oak',
      '["HO","RENTERS LANDLORD"]'::jsonb,
      'open',
      'Southern Oak Agent Portal',
      'https://www.southernoak.com',
      'https://soi.policyport.com',
      '1-877-900-3971',
      '1-877-900-2280',
      'Southern Oak Insurance. FL/SC/GA HO/DP. Premier rates 7/15/2026. Agent portal southernoak.com / soi.policyport.com.',
      'Florida / South Carolina / Georgia',
      'portal',
      'limited',
      note,
      qrg_rows,
      'southern-oak-qrg-2026-09',
      true,
      now(),
      now()
    );
    existing_id := seeded_id;
  ELSE
    UPDATE carriers
    SET
      written_lines = CASE
        WHEN written_lines @> '["HO"]'::jsonb THEN written_lines
        ELSE coalesce(written_lines, '[]'::jsonb) || '["HO"]'::jsonb
      END,
      portal_status = coalesce(nullif(portal_status, ''), 'open'),
      portal_login = coalesce(nullif(portal_login, ''), 'Southern Oak Agent Portal'),
      website = coalesce(nullif(website, ''), 'https://www.southernoak.com'),
      agent_portal_url = coalesce(nullif(agent_portal_url, ''), 'https://soi.policyport.com'),
      customer_service_phone = coalesce(nullif(customer_service_phone, ''), '1-877-900-3971'),
      claims_phone = coalesce(nullif(claims_phone, ''), '1-877-900-2280'),
      carrier_info = CASE
        WHEN coalesce(carrier_info, '') = '' THEN 'Southern Oak Insurance. FL/SC/GA HO/DP. Premier rates 7/15/2026. Agent portal southernoak.com / soi.policyport.com.'
        WHEN carrier_info ILIKE '%7/15/2026%' OR carrier_info ILIKE '%$7.5%' THEN carrier_info
        ELSE carrier_info || E'\nPremier rates 7/15/2026. HO-3 TIV $7.5M. Year built 1950+. DP-3 Cov A $1M. Bulletin 2026-09-16.'
      END,
      territory = coalesce(nullif(territory, ''), 'Florida / South Carolina / Georgia'),
      preferred_submission = coalesce(nullif(preferred_submission, ''), 'portal'),
      appetite_notes = note,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' NOT IN (
            'southern-oak-ho3-ho6-premier-2026',
            'southern-oak-dp3-2026',
            'southern-oak-ho4-2019',
            'southern-oak-wind-2022'
          )
        ) kept
      ) || qrg_rows,
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
      min_cov_a = 75000,
      max_cov_a = 7500000,
      min_year_built = 1950,
      max_roof_age = 15,
      coastal_allowed = true,
      mobile_allowed = false,
      notes = note,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, min_cov_a, max_cov_a, min_year_built,
      max_roof_age, coastal_allowed, mobile_allowed, requires_opening_protection,
      require_replacement_cost, notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', 75000, 7500000, 1950, 15,
      true, false, false, false, note, now(), now()
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
      'southern_oak',
      'Southern Oak Insurance',
      'fl_property',
      '["HO3","HO6","HO4","DP1","DP3","WIND_ONLY"]'::jsonb,
      '[]'::jsonb,
      '["FL","SC","GA"]'::jsonb,
      '[]'::jsonb,
      '["FL","SC","GA"]'::jsonb,
      'Southern Oak Agent Portal',
      '1-877-900-3971',
      true,
      hard,
      soft,
      pref,
      'selective',
      note,
      9,
      9,
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
