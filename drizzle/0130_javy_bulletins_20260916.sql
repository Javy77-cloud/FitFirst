-- Javy 2026-09-16 carrier bulletins: Stand (create if missing), Universal P&C,
-- Nationwide Powersports, Olympus FL HO UW Guidelines / QRG June 15, 2026.
-- Idempotent. Does not modify 0123-0129. Stand / Universal P&C / Nationwide / Olympus only.
-- Captain applies this file on Neon after merge.
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333341';
  existing_id uuid;
  note text := $stand$STAND Florida contacts (Javy bulletin 2026-09-16). Main 1-888-319-1332 (FNOL / underwriting / service). Claims: report 1-888-319-1332; existing claims Next Era 833-667-8263 (833-OnStand) / Office@nexteraclaims.com. Policy updates stand_uw@getstandfl.com; mitigations florida.mitigations@standinsurance.com; agency services agencyservices@getstandfl.com. Mail PO Box 459000, Sunrise, FL 33345. Fax 1-941-229-6121. CA misdirect warm-transfer 1-415-903-8091. Sales: Mike Killingsworth Head of Sales 863-370-8607 mike@standinsurance.com; Maggie Grignon Account Executive 415-223-0694 maggieg@standinsurance.com. Web standinsurance.com / getstandfl.com. Written lines HO (FL). No UW mins on this contacts sheet.$stand$;
  qrg_row jsonb;
  hard jsonb := '["state!=FL","mobile_home"]'::jsonb;
  soft jsonb := '["older_roof"]'::jsonb;
  pref jsonb := '["fl_single_family"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_row := jsonb_build_array(jsonb_build_object(
    'id', 'stand-fl-contacts-2026-09-16',
    'dateRequested', '2026-09-16',
    'lob', 'HO',
    'roofAge', '',
    'waterHeater', '',
    'hvac', '',
    'electrical', '',
    'claimsHistory', '',
    'acceptDecline', 'accept',
    'notes', note
  ));

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(trim(c.name)) = 'stand'
      OR lower(c.name) LIKE 'stand %'
      OR lower(c.name) LIKE '%stand insurance%'
      OR lower(c.name) LIKE '%getstandfl%'
      OR lower(c.name) LIKE '%stand florida%'
    )
  ORDER BY
    CASE
      WHEN lower(trim(c.name)) = 'stand' OR lower(c.name) LIKE '%stand insurance%' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, portal_login, phone, email,
      website, mailing_address, customer_service_phone, underwriter_email, underwriter_phone,
      claims_contact_name, claims_contact_email, claims_phone,
      marketing_contact_name, marketing_contact_phone, marketing_contact_email,
      account_manager_name, account_manager_phone, account_manager_email,
      carrier_info, territory, preferred_submission, binding_authority,
      appetite_notes, appetite_rows, fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id,
      tenant,
      'Stand',
      '["HO"]'::jsonb,
      'open',
      'STAND Florida',
      '1-888-319-1332',
      'agencyservices@getstandfl.com',
      'https://www.standinsurance.com',
      'PO Box 459000, Sunrise, FL 33345',
      '1-888-319-1332',
      'stand_uw@getstandfl.com',
      '1-888-319-1332',
      'Next Era',
      'Office@nexteraclaims.com',
      '833-667-8263',
      'Mike Killingsworth',
      '863-370-8607',
      'mike@standinsurance.com',
      'Maggie Grignon',
      '415-223-0694',
      'maggieg@standinsurance.com',
      'STAND Florida. Main 1-888-319-1332 (FNOL/UW/Service). Claims Next Era 833-667-8263 / Office@nexteraclaims.com. standinsurance.com / getstandfl.com.',
      'Florida',
      'email',
      'limited',
      note,
      qrg_row,
      'stand-fl-contacts-2026-09',
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
      portal_login = coalesce(nullif(portal_login, ''), 'STAND Florida'),
      phone = coalesce(nullif(phone, ''), '1-888-319-1332'),
      email = coalesce(nullif(email, ''), 'agencyservices@getstandfl.com'),
      website = coalesce(nullif(website, ''), 'https://www.standinsurance.com'),
      mailing_address = coalesce(nullif(mailing_address, ''), 'PO Box 459000, Sunrise, FL 33345'),
      customer_service_phone = coalesce(nullif(customer_service_phone, ''), '1-888-319-1332'),
      underwriter_email = coalesce(nullif(underwriter_email, ''), 'stand_uw@getstandfl.com'),
      underwriter_phone = coalesce(nullif(underwriter_phone, ''), '1-888-319-1332'),
      claims_contact_name = coalesce(nullif(claims_contact_name, ''), 'Next Era'),
      claims_contact_email = coalesce(nullif(claims_contact_email, ''), 'Office@nexteraclaims.com'),
      claims_phone = coalesce(nullif(claims_phone, ''), '833-667-8263'),
      marketing_contact_name = coalesce(nullif(marketing_contact_name, ''), 'Mike Killingsworth'),
      marketing_contact_phone = coalesce(nullif(marketing_contact_phone, ''), '863-370-8607'),
      marketing_contact_email = coalesce(nullif(marketing_contact_email, ''), 'mike@standinsurance.com'),
      account_manager_name = coalesce(nullif(account_manager_name, ''), 'Maggie Grignon'),
      account_manager_phone = coalesce(nullif(account_manager_phone, ''), '415-223-0694'),
      account_manager_email = coalesce(nullif(account_manager_email, ''), 'maggieg@standinsurance.com'),
      territory = coalesce(nullif(territory, ''), 'Florida'),
      appetite_notes = note,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' IS DISTINCT FROM 'stand-fl-contacts-2026-09-16'
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
    SET notes = note, mobile_allowed = false, updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, coastal_allowed, mobile_allowed,
      requires_opening_protection, require_replacement_cost, notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', true, false, false, false, note, now(), now()
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
      tenant, 'stand', 'Stand', 'fl_property', '["HO3"]'::jsonb, '[]'::jsonb,
      '["FL"]'::jsonb, '[]'::jsonb, '["FL"]'::jsonb, 'STAND Florida', '1-888-319-1332',
      true, hard, soft, pref, 'selective', note, 15, 15, false, existing_id, now(), now()
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
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  live_id uuid := '76ccf3a7-68c2-436b-8642-554cf96391c2';
  existing_id uuid;
  note text := $upc$UPCIC FL Underwriting Binding Guidelines 05/26/2026. 100% RCV must be Cov A on all forms except HO4 and HO8 (HO8 may use 100% ACV when Optional RC Loss Settlement is not selected; properties over 100 years must be ACV). Check Atlas Bridge Check Form Availability for closed zips/territories. No backdated cancellations. Panhandle counties: Bay, Escambia, Okaloosa, Santa Rosa, Walton. HO3 Cov A X-Wind in Windpool / All Wind and Non-Windpool: Broward, Miami-Dade, Palm Beach built 1950+ $250,000-$1,000,000 / $250,000-$1,500,000 (1950-1975 must bind Water Damage Exclusion or Limited Water $10,000; full water available post-bind with acceptable 4-point). All other counties built 1950+ $100,000-$1,000,000 / $100,000-$1,500,000. HO8 all counties built 1900+ $100,000-$1,000,000 / $100,000-$1,500,000. DP1 Panhandle built 2002+ or Tri-County built 1976+ or other counties built 1900+: $100,000-$500,000 / $100,000-$750,000. DP2/DP3 Panhandle 2002+ or Tri-County 1976+ or other counties 1940+: $100,000-$500,000 / $100,000-$750,000. HO4 Cov C $20,000-$300,000 (Cov A N/A; built 1900+). HO6 Cov A $15,000-$1,000,000 (RCE required if A bound below $50k); owner Cov C $20,000-$500,000; tenant Cov C $6,000 min and max. Wind mit: OIR-B1-1802 only. Rev 01/12 acceptable if inspection before 4/1/2026; on/after 4/1/2026 use Rev 04/26. Opening Protection credit only with 1802 in the insured name. Hip roof credit via 4+ color photos confirming 100% hip or an 1802. Age: roof/HVAC/electrical updates within 30 years (not HO4). 4-point if older than 40 years (except HO4/HO6/HO8). No polybutylene or PEX except HO8 and DP1 (PEX ok if built or updated 2010+). ACV roof and/or water limitation may apply for roofs over 20 years. HVAC: no portable space heaters; operable A/C statewide; vented heat except listed south counties. Electrical: 100 amp min; no aluminum branch, cloth, knob-tube, or double-tap (Alumiconn/Copalum ok); no fuses; no FPE/Stab-Lok, Zinsco, Sylvania-Zinsco, Challenger-Zinsco. Ineligible: mobile/trailer, manufactured/modular, dome/unusual, EIFS, pre-existing damage, co-op condos (HO4 ok), commercial (excl home daycare), DIY, builder risk, historic, over sand (HO8 ok), farming/ag, Chinese drywall, over water, open foundation (HO8 and DP1 ok; HO3/DP2/DP3 ok if 2002+ or FEMA Diagram 6). PC 10 not acceptable except HO3 masonry/superior. Vacant/unoccupied and short-term rentals ineligible. Prior sinkhole ever ineligible. Edition 05/26/2026.$upc$;
  qrg_rows jsonb;
  hard jsonb := '["mobile_home","manufactured","min_cov_a:100000","max_cov_a:1500000"]'::jsonb;
  soft jsonb := '["older_roof_no_cert"]'::jsonb;
  pref jsonb := '["habitational","coastal_ho"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_rows := jsonb_build_array(
    jsonb_build_object('id','upcic-ho3-binding-2026-05-26','dateRequested','2026-05-26','lob','HO3','roofAge','Updates within 30 years; ACV roof and/or water limitation may apply over 20 years','waterHeater','','hvac','Updates within 30 years; operable A/C statewide; no portable space heaters','electrical','100 amp min; no Al branch, cloth, knob-tube, double-tap, fuses, FPE/Zinsco/Sylvania-Zinsco/Challenger-Zinsco','claimsHistory','No sinkhole ever. Except HO8: no dog bite/fire/theft last 36 months; 1 other loss ok; 1 remediated water last 36 ok','acceptDecline','accept','notes','HO3 05/26/2026. Tri-County 1950+ $250k-$1.0M X-Wind / $250k-$1.5M all-wind (1950-1975 water excl or Limited Water $10k). Other counties 1950+ $100k-$1.0M / $100k-$1.5M. 100% RCV.'),
    jsonb_build_object('id','upcic-ho8-binding-2026-05-26','dateRequested','2026-05-26','lob','HO8','roofAge','Updates within 30 years','waterHeater','','hvac','Updates within 30 years','electrical','100 amp min; same prohibited wiring/panels as HO3','claimsHistory','HO8: 3 or fewer losses last 36 months; no fire last 36 months','acceptDecline','accept','notes','HO8 all counties built 1900+ $100k-$1.0M X-Wind / $100k-$1.5M all-wind. 100% ACV allowed when Optional RC not selected; over 100 years must be ACV.'),
    jsonb_build_object('id','upcic-dp1-binding-2026-05-26','dateRequested','2026-05-26','lob','DP1','roofAge','Updates within 30 years','waterHeater','','hvac','Updates within 30 years','electrical','100 amp min','claimsHistory','No sinkhole ever','acceptDecline','accept','notes','DP1 05/26/2026. Panhandle 2002+ or Tri-County 1976+ or other counties 1900+: $100k-$500k X-Wind / $100k-$750k all-wind.'),
    jsonb_build_object('id','upcic-dp2-dp3-binding-2026-05-26','dateRequested','2026-05-26','lob','DP2/DP3','roofAge','Updates within 30 years','waterHeater','','hvac','Updates within 30 years','electrical','100 amp min','claimsHistory','No sinkhole ever','acceptDecline','accept','notes','DP2/DP3 05/26/2026. Panhandle 2002+ or Tri-County 1976+ or other counties 1940+: $100k-$500k X-Wind / $100k-$750k all-wind.'),
    jsonb_build_object('id','upcic-ho4-binding-2026-05-26','dateRequested','2026-05-26','lob','HO4','roofAge','Roof/HVAC restriction does not apply','waterHeater','','hvac','','electrical','','claimsHistory','No sinkhole ever','acceptDecline','accept','notes','HO4 Cov C $20k-$300k (Cov A N/A). Built 1900+. Co-op ownership acceptable on HO4 only.'),
    jsonb_build_object('id','upcic-ho6-binding-2026-05-26','dateRequested','2026-05-26','lob','HO6','roofAge','4-point not required','waterHeater','','hvac','','electrical','100 amp min','claimsHistory','No sinkhole ever','acceptDecline','accept','notes','HO6 Cov A $15k-$1.0M (RCE required if A bound below $50k). Owner Cov C $20k-$500k; tenant Cov C $6k min and max.')
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = live_id
      OR lower(c.name) LIKE '%universal p&c%'
      OR lower(c.name) LIKE '%universal property%'
    )
    AND lower(c.name) NOT LIKE '%north america%'
    AND lower(c.name) NOT LIKE '%uicna%'
  ORDER BY
    CASE
      WHEN lower(c.name) LIKE '%universal p&c%' OR lower(c.name) LIKE '%universal property%' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE carriers
  SET
    written_lines = CASE
      WHEN written_lines @> '["HO"]'::jsonb THEN written_lines
      ELSE coalesce(written_lines, '[]'::jsonb) || '["HO"]'::jsonb
    END,
    portal_status = coalesce(nullif(portal_status, ''), 'open'),
    portal_login = coalesce(nullif(portal_login, ''), 'Universal Property Agent Portal'),
    customer_service_phone = coalesce(nullif(customer_service_phone, ''), '1-800-425-9113'),
    territory = coalesce(nullif(territory, ''), 'Florida'),
    preferred_submission = coalesce(nullif(preferred_submission, ''), 'portal'),
    appetite_notes = note,
    appetite_rows = (
      SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT elem, ord
        FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
          WITH ORDINALITY AS t(elem, ord)
        WHERE elem->>'id' NOT IN (
          'upcic-ho3-binding-2026-05-26',
          'upcic-ho8-binding-2026-05-26',
          'upcic-dp1-binding-2026-05-26',
          'upcic-dp2-dp3-binding-2026-05-26',
          'upcic-ho4-binding-2026-05-26',
          'upcic-ho6-binding-2026-05-26'
        )
      ) kept
    ) || qrg_rows,
    dont_write_notes = CASE
      WHEN coalesce(dont_write_notes, '') ILIKE '%UPCIC 05/26/2026 ineligible%' THEN dont_write_notes
      WHEN coalesce(dont_write_notes, '') = '' THEN 'UPCIC 05/26/2026 ineligible: mobile/trailer, manufactured/modular, vacant/unoccupied, short-term rentals, EIFS, dome/unusual, over water, historic, Chinese drywall, sinkhole history.'
      ELSE dont_write_notes || E'\nUPCIC 05/26/2026 ineligible: mobile/trailer, manufactured/modular, vacant/unoccupied, short-term rentals, EIFS, dome/unusual, over water, historic, Chinese drywall, sinkhole history.'
    END,
    active = true,
    updated_at = now()
  WHERE id = existing_id;

  IF EXISTS (
    SELECT 1 FROM appetite_rules
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO'
  ) THEN
    UPDATE appetite_rules
    SET
      min_cov_a = 100000,
      max_cov_a = 1500000,
      coastal_allowed = true,
      mobile_allowed = false,
      require_replacement_cost = true,
      county_min_cov_a = '{"Broward":250000,"Miami-Dade":250000,"Palm Beach":250000}'::jsonb,
      notes = note,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, min_cov_a, max_cov_a,
      coastal_allowed, mobile_allowed, requires_opening_protection,
      require_replacement_cost, county_min_cov_a, notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', 100000, 1500000, true, false, false, true,
      '{"Broward":250000,"Miami-Dade":250000,"Palm Beach":250000}'::jsonb,
      note, now(), now()
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
      tenant, 'universal_pc', 'Universal Property & Casualty', 'fl_property',
      '["HO3","HO4","HO6","HO8","DP1","DP2","DP3"]'::jsonb, '[]'::jsonb,
      '["FL"]'::jsonb, '[]'::jsonb, '["FL","SE","mid_atlantic_select"]'::jsonb,
      'Universal Property Agent Portal', '1-800-425-9113', true, hard, soft, pref, 'open',
      note, 0, 0, false, existing_id, now(), now()
    )
    ON CONFLICT (tenant_id, carrier_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      lines_offered = EXCLUDED.lines_offered,
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
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  live_id uuid := '59ce34a0-1bca-477a-879a-95d2127bff9e';
  existing_id uuid;
  note text := $nw$Multi-line. Listed states only (no invented 50; CA/FL HO not assumed). Confirm current HO footprint. FL HO: specialists outrank. Research-dated 2026-09. Nationwide Powersports (Boat + Motorcycle + RV) NPC-0577FL 02/22 FL. Boat: up to 35 feet, $200,000 value, 20 years old; up to 3 engines (500 hp on 1 / 1,000 hp on 2 / 1,050 hp on 3); top speed 60 mph; up to 9 vessels; high-performance not acceptable; trailers required. Includes Hurricane Haul-Out up to $1,000, fuel spill (up to PD limit), navigation up to 100 miles off US coast, salvage/wreckage removal, one limit for boat/trailer/motor, Vanishing Deductible up to $500. Valuation: Total Loss Replacement first 2 years original owner; Agreed Value boats 15 years old or less; ACV. Eligible boat types: bass, cabin cruiser, freshwater fishing, PWC, pontoon, runabout/deck, sailboat, saltwater fishing, ski/surf. Motorcycle: max insurable value $80,000; gas and electric; up to 9 vehicles on 1 policy; drivers ages 10+ on off-road. Includes guest passenger, collision safety apparel up to $2,000, custom parts/equipment up to $3,000 (comp optional up to $30,000), Vanishing Deductible up to $500. ACV or Agreed Value. Eligible: cruisers, touring, adventure/dual-purpose, sport, scooters/mopeds, autocycles/reverse trikes, custom/limited-edition, ATV/side-by-side, dirt bikes, snowmobiles, e-bikes, golf carts/utility, lawn/garden tractors, personal transporters, motorcycle trailers. RV: motorhomes up to $800,000; travel trailers up to $500,000; no length restrictions; full-timers available; up to 9 vehicles. Powersports Service Center 1-877-877-7907 specsvc@nationwide.com. Acceptability can differ by region/state — confirm Reference Connect. Appetite notes + specialty line tags only; not a boat rater.$nw$;
  qrg_rows jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_rows := jsonb_build_array(
    jsonb_build_object('id','nationwide-powersports-boat-2022-02','dateRequested','2022-02-01','lob','BOAT','roofAge','','waterHeater','','hvac','','electrical','','claimsHistory','','acceptDecline','accept','notes','Boat: 35 ft / $200k / 20 years; 3 engines 500/1000/1050 hp; 60 mph; 9 vessels; no high-performance; trailers required. PWC eligible. Hurricane Haul-Out $1k. Service 1-877-877-7907. NPC-0577FL 02/22.'),
    jsonb_build_object('id','nationwide-powersports-moto-2022-02','dateRequested','2022-02-01','lob','MCY','roofAge','','waterHeater','','hvac','','electrical','','claimsHistory','','acceptDecline','accept','notes','Motorcycle: max $80k; gas/electric; 9 vehicles; drivers 10+ off-road. Guest passenger; apparel $2k; custom $3k (comp optional $30k). ACV or agreed value. NPC-0577FL 02/22.'),
    jsonb_build_object('id','nationwide-powersports-rv-2022-02','dateRequested','2022-02-01','lob','RV','roofAge','','waterHeater','','hvac','','electrical','','claimsHistory','','acceptDecline','accept','notes','RV: motorhomes $800k; travel trailers $500k; no length limit; full-timers ok; 9 vehicles. NPC-0577FL 02/22.')
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = live_id
      OR lower(trim(c.name)) = 'nationwide'
      OR lower(c.name) LIKE 'nationwide %'
    )
  ORDER BY
    CASE WHEN lower(trim(c.name)) = 'nationwide' THEN 0 ELSE 1 END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE carriers
  SET
    written_lines = CASE
      WHEN written_lines @> '["RV"]'::jsonb AND written_lines @> '["BOAT"]'::jsonb THEN written_lines
      WHEN written_lines @> '["RV"]'::jsonb THEN written_lines || '["BOAT"]'::jsonb
      WHEN written_lines @> '["BOAT"]'::jsonb THEN written_lines || '["RV"]'::jsonb
      ELSE coalesce(written_lines, '[]'::jsonb) || '["RV","BOAT"]'::jsonb
    END,
    appetite_notes = note,
    appetite_rows = (
      SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT elem, ord
        FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
          WITH ORDINALITY AS t(elem, ord)
        WHERE elem->>'id' NOT IN (
          'nationwide-powersports-boat-2022-02',
          'nationwide-powersports-moto-2022-02',
          'nationwide-powersports-rv-2022-02'
        )
      ) kept
    ) || qrg_rows,
    active = true,
    updated_at = now()
  WHERE id = existing_id;

  IF to_regclass('public.carrier_appetite') IS NOT NULL THEN
    INSERT INTO carrier_appetite (
      tenant_id, carrier_id, legal_name, segment, lines_offered, lines_not_offered,
      states_available, states_restricted, states_raw, portal_name, cs_phone,
      rateable, hard_declines, soft_cautions, preferred_signals, cat_posture,
      notes_for_agent, needs_state_confirm, linked_carrier_id, created_at, updated_at
    ) VALUES (
      tenant, 'nationwide', 'Nationwide Mutual Insurance', 'national',
      '["PAP","HO3","HO6","UMB","FARM","BOAT","MCY","RV"]'::jsonb, '[]'::jsonb,
      '["AL","AZ","AR","CO","CT","DE","GA","IL","IN","IA","KS","KY","MD","MI","MN","MO","NE","NV","NH","NJ","NM","NY","NC","OH","OK","OR","PA","SC","TN","TX","UT","VA","WA","WI"]'::jsonb,
      '[]'::jsonb,
      '["AL","AZ","AR","CO","CT","DE","GA","IL","IN","IA","KS","KY","MD","MI","MN","MO","NE","NV","NH","NJ","NM","NY","NC","OH","OK","OR","PA","SC","TN","TX","UT","VA","WA","WI","other"]'::jsonb,
      'Nationwide Agency Portal', '1-877-669-6877', true, '[]'::jsonb, '["older_roof"]'::jsonb,
      '["multi_line_bundle"]'::jsonb, 'selective', note, true, existing_id, now(), now()
    )
    ON CONFLICT (tenant_id, carrier_id) DO UPDATE SET
      lines_offered = EXCLUDED.lines_offered,
      notes_for_agent = EXCLUDED.notes_for_agent,
      linked_carrier_id = EXCLUDED.linked_carrier_id,
      updated_at = now();
  END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333342';
  existing_id uuid;
  note text := $oly$Olympus FL Homeowners Multi-peril General Underwriting Guidelines / QRG June 15, 2026 (image-only PDF; paired Salesforce Homeowners Quick Reference Guide V0426). Eligible limits: Cov A min $500,000 rest of state / $1,000,000 Tri-County; max $5,000,000; TIV max $8,000,000. Quote-gate floors Cov A at $500,000 statewide; Markets raises Broward / Miami-Dade / Palm Beach to $1,000,000. Cov B 2% of dwelling default (0-20% blanket; scheduled up to 70%). Cov C 50% default (0-75%). Cov D 10%. Cov E liability default $300,000 ($100k/$500k/$1M available). Cov F med pay default $1,000 ($5k/$10k/$25k). Insurance to value 100-125% RCE; 20% extended dwelling available (default none). Blanket personal property max $10,000 per item / $100,000 jewelry. AOP deductible min $1,000 ($2.5k/$5k/$10k/$25k/$50k); no special deductible less than AOP. Hurricane 2%/5% within 1,000 feet of coast (1%/3%/4%/10% available). Sinkhole deductible 10%. Occupancy: 1- or 2-family; seasonal/secondary/rentals eligible (rental liability premises-only + surcharge). Incidental business under 2 customer visits per week eligible. Ineligible occupancy: under construction/renovation, vacant/unoccupied, foreclosure/short-sale/as-is, home daycare or assisted living, more than 2 customer visits per week, commercial/retail farming, more than 2 roomers. Applicant: named insured must have insurable interest; refer 2+ non-domestic-partner named insureds, trusts/LLCs (questionnaire), high-profile occupations. Credit score reviewed at new business and at least every second renewal. Refer >1 loss in 3 years, >2 in 5 years, or any claim over $100,000; pattern of frequency/severity/carelessness ineligible; cancel/non-renew last 3 years or lapse refer. Ineligible: arson/fraud/felony, BK/judgments/foreclosure/repossession/liens last 5 years, first-party personal-lines lawsuit not prevailed/settled, distressed purchase, refuse inspection, or fail to provide UW info. Location: refer peak TIV concentration, hydrant >1,000 ft or fire dept >5 miles, acreage >5. Wind within 1,000 ft of coast requires min 5% hurricane deductible. Flood not in base policy; Flood Zones A/V ineligible unless separately flooded. Sinkhole density >30/sq mi ineligible; sinkhole endorsement ineligible if density >3.54/sq mi; prior/current sinkhole on premises not online-bindable. Monroe County ineligible with wind (ex-wind eligible). Over water, ferry/boat-only access, or moratorium ineligible. Construction: manufactured/modular/mobile/trailer ineligible; EIFS if built prior to 2000 ineligible; log homes and unique/obsolete/irreplaceable construction generally ineligible; stilts/piers/pilings prior to 1995 refer; 7,500 sq ft+ ineligible. All dwellings inspected. Roof online bind: architectural shingle 15 / clay-concrete-Spanish tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable; flat refer; 5+ years useful life inspection may substitute. Electrical: 200-amp if built before 1995; no knob-and-tube, aluminum, Zinsco (GTE-Sylvania), FPE, Challenger, Pushmatic, Bulldog, or fuse boxes. Plumbing: PB ineligible pre-1995 (water excl + $10,000 limited-water buyback); galvanized pre-1995 needs plumbing inspection. Water heater: traditional inside/attic 15, outside/garage 20; tankless 20. No wood stove as sole heat; underground fuel tanks ineligible. Unsecured pools ineligible; pool liability needs 4-ft locked fence or screen; diving boards/slides ineligible for pool liability. Pets: vicious/bite history, guard dogs, wolf hybrids, >3 dogs, zoo/exotic ineligible; animal liability not eligible with exotic or bite history. Water exclusion auto-attaches if home over 40 years or PB unless automatic shutoff. Payment: annual 100% before effective, or four-pay 25% at bind+14 days then months 2/5/8. Late pay accepted 1 month past due. Reinstatement >30 days refer; Statement of No Known Losses required. CS 1-800-711-9386.$oly$;
  qrg_row jsonb;
  dont text := $olydw$Olympus 06/15/2026 ineligible: vacant/unoccupied, manufactured/modular/mobile/trailer, Monroe with wind, flood zones A/V without separate flood, sinkhole density >30/sq mi, 7,500+ sq ft, EIFS pre-2000, over water, ferry/boat-only access, moratorium, home daycare, wood stove as sole heat, underground fuel tanks, vicious pets/guard dogs/wolf hybrids/>3 dogs/exotics.$olydw$;
  hard jsonb := '["state!=FL","poor_construction","mobile_home","manufactured","vacant","min_cov_a:500000","max_cov_a:5000000"]'::jsonb;
  soft jsonb := '["older_roof"]'::jsonb;
  pref jsonb := '["strong_construction","mitigation_credits"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_row := jsonb_build_array(
    jsonb_build_object(
      'id', 'olympus-fl-ho-uw-2026-06-15',
      'dateRequested', '2026-06-15',
      'lob', 'HO3',
      'roofAge', 'Arch shingle 15 / tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable',
      'waterHeater', 'Traditional inside/attic 15; outside/garage 20; tankless 20',
      'hvac', 'No wood stove as sole heat; professionally installed supplemental wood-burning only',
      'electrical', '200-amp if built before 1995; no knob-tube, aluminum, Zinsco, FPE, Challenger, Pushmatic, Bulldog, fuses',
      'claimsHistory', 'Refer: >1 loss in 3 years, >2 in 5 years, or any claim over $100,000',
      'acceptDecline', 'accept',
      'notes', note
    ),
    jsonb_build_object(
      'id', 'olympus-fl-ho-occupancy-2026-06-15',
      'dateRequested', '2026-06-15',
      'lob', 'HO3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', 'Refer >1/3yr, >2/5yr, or any claim over $100k; pattern of frequency/severity/carelessness ineligible',
      'acceptDecline', 'decline',
      'notes', 'Ineligible occupancy: vacant/unoccupied, under construction/renovation, foreclosure/short-sale/as-is, home daycare/assisted living, >2 customer visits/week, commercial/retail farming, >2 roomers. Seasonal/secondary/rentals ok (premises-only liability + surcharge). Refer 2+ non-domestic-partner named insureds, trusts/LLCs, high-profile occupations, cancel/non-renew last 3 years, or lapse.'
    ),
    jsonb_build_object(
      'id', 'olympus-fl-ho-location-2026-06-15',
      'dateRequested', '2026-06-15',
      'lob', 'HO3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'decline',
      'notes', 'Monroe with wind ineligible (ex-wind eligible). Flood Zones A/V ineligible unless separately flooded. Sinkhole density >30/sq mi ineligible; endorsement ineligible >3.54/sq mi; prior/current sinkhole not online-bindable. Wind within 1,000 ft of coast needs 5% hurricane deductible. Refer peak TIV, hydrant >1,000 ft, fire dept >5 miles, acreage >5. Over water, ferry/boat-only, or moratorium ineligible.'
    ),
    jsonb_build_object(
      'id', 'olympus-fl-ho-construction-2026-06-15',
      'dateRequested', '2026-06-15',
      'lob', 'HO3',
      'roofAge', 'Online bind: arch shingle 15 / tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable; flat refer',
      'waterHeater', 'Traditional inside/attic 15; outside/garage 20; tankless 20',
      'hvac', 'No wood stove as sole heat; underground fuel tanks ineligible',
      'electrical', '200-amp if built before 1995; no knob-tube, aluminum, Zinsco, FPE, Challenger, Pushmatic, Bulldog, fuses',
      'claimsHistory', '',
      'acceptDecline', 'decline',
      'notes', 'Manufactured/modular/mobile/trailer ineligible. EIFS pre-2000 ineligible. Log/unique/obsolete construction generally ineligible. Stilts/piers/pilings pre-1995 refer. 7,500 sq ft+ ineligible. PB pre-1995 ineligible (water excl + $10k limited-water buyback). Unsecured pools ineligible.'
    ),
    jsonb_build_object(
      'id', 'olympus-fl-ho-endorsements-2026-06-15',
      'dateRequested', '2026-06-15',
      'lob', 'HO3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'Water exclusion auto-attaches if home over 40 years or PB unless automatic shutoff. Pool liability needs 4-ft locked fence or screen; diving boards/slides ineligible. Animal liability not eligible with exotic or bite history. Payment: annual 100% before effective, or four-pay 25% at bind+14 days then months 2/5/8. Late pay 1 month past due. Reinstatement >30 days refer + Statement of No Known Losses.'
    )
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(c.name) LIKE '%olympus%'
    )
  ORDER BY
    CASE WHEN lower(c.name) LIKE '%olympus%' THEN 0 ELSE 1 END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, written_lines, portal_status, portal_login, website,
      customer_service_phone, carrier_info, territory, preferred_submission,
      binding_authority, appetite_notes, appetite_rows, dont_write_notes,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id, tenant, 'Olympus', '["HO"]'::jsonb, 'open', 'Olympus Agent Portal',
      'https://www.olympusinsurance.com', '1-800-711-9386',
      'Olympus Insurance Company. FL HO Multi-peril UW Guidelines / QRG June 15, 2026 (paired Salesforce V0426).',
      'Florida', 'portal', 'limited', note, qrg_row, dont, 'olympus-ho-uw-2026-06', true, now(), now()
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
      portal_login = coalesce(nullif(portal_login, ''), 'Olympus Agent Portal'),
      website = coalesce(nullif(website, ''), 'https://www.olympusinsurance.com'),
      customer_service_phone = coalesce(nullif(customer_service_phone, ''), '1-800-711-9386'),
      territory = coalesce(nullif(territory, ''), 'Florida'),
      carrier_info = 'Olympus Insurance Company. FL HO Multi-peril UW Guidelines / QRG June 15, 2026 (paired Salesforce V0426).',
      appetite_notes = note,
      dont_write_notes = dont,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' NOT IN (
            'olympus-fl-ho-uw-2026-06-15',
            'olympus-fl-ho-occupancy-2026-06-15',
            'olympus-fl-ho-location-2026-06-15',
            'olympus-fl-ho-construction-2026-06-15',
            'olympus-fl-ho-endorsements-2026-06-15'
          )
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
      min_cov_a = 500000,
      max_cov_a = 5000000,
      max_roof_age = 15,
      coastal_allowed = true,
      mobile_allowed = false,
      require_replacement_cost = true,
      rce_floor_ratio = 1,
      excluded_counties = '["Monroe"]'::jsonb,
      county_min_cov_a = '{"Broward":1000000,"Miami-Dade":1000000,"Palm Beach":1000000}'::jsonb,
      notes = note,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, min_cov_a, max_cov_a, max_roof_age,
      coastal_allowed, mobile_allowed, requires_opening_protection,
      require_replacement_cost, rce_floor_ratio, excluded_counties, county_min_cov_a,
      notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', 500000, 5000000, 15, true, false, false, true, 1,
      '["Monroe"]'::jsonb,
      '{"Broward":1000000,"Miami-Dade":1000000,"Palm Beach":1000000}'::jsonb,
      note, now(), now()
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
      tenant, 'olympus', 'Olympus Insurance Company', 'fl_property',
      '["HO3","HO6","DP3","UMB"]'::jsonb, '[]'::jsonb,
      '["FL"]'::jsonb, '[]'::jsonb, '["FL"]'::jsonb, 'Olympus Agent Portal', '1-800-711-9386',
      true, hard, soft, pref, 'selective', note, 14, 14, false, existing_id, now(), now()
    )
    ON CONFLICT (tenant_id, carrier_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      lines_offered = EXCLUDED.lines_offered,
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
