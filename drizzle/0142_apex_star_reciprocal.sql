-- Apex Star Reciprocal Exchange (aka Apex Star Insurance Exchange).
-- Idempotent: reuse an existing Apex Star row; never insert a duplicate name.
-- Post-merge: `drizzle-kit migrate` (or apply this file). Optional `npm run appetite:import`
-- refreshes the full FL specialty pack from CSV (this file already upserts the Apex Star slug).
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333343';
  existing_id uuid;
  note text := $apex$Apex Star Reciprocal Exchange (aka Apex Star Insurance Exchange). Florida-admitted P&C reciprocal, member of StarLight Insurance Group (Tampa). HO-3, DP-3, and commercial property. Contact customerservice@apexstarins.com / (888) 876-8005. Web apexstarins.com. HQ 6135 W. Sitka St., Tampa, FL 33634. NAIC 17742. No UW mins on this contacts sheet.$apex$;
  info text := $info$Apex Star Reciprocal Exchange (aka Apex Star Insurance Exchange). Florida-admitted P&C reciprocal. StarLight Insurance Group, Tampa. HO-3 / DP-3 / commercial property. apexstarins.com. customerservice@apexstarins.com / (888) 876-8005.$info$;
  qrg_rows jsonb;
  hard jsonb := '["state!=FL","mobile_home"]'::jsonb;
  soft jsonb := '["older_roof"]'::jsonb;
  pref jsonb := '["fl_reciprocal","fl_single_family"]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

  qrg_rows := jsonb_build_array(
    jsonb_build_object(
      'id', 'apex-star-ho3-contacts-2026-09',
      'dateRequested', '2026-09-19',
      'lob', 'HO3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', note
    ),
    jsonb_build_object(
      'id', 'apex-star-dp3-contacts-2026-09',
      'dateRequested', '2026-09-19',
      'lob', 'DP3',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'Apex Star DP-3 dwelling / landlord. Same contacts as HO-3. No UW mins on this contacts sheet.'
    ),
    jsonb_build_object(
      'id', 'apex-star-commercial-contacts-2026-09',
      'dateRequested', '2026-09-19',
      'lob', 'BOP',
      'roofAge', '',
      'waterHeater', '',
      'hvac', '',
      'electrical', '',
      'claimsHistory', '',
      'acceptDecline', 'accept',
      'notes', 'Apex Star commercial property. Same contacts as HO-3. No UW mins on this contacts sheet.'
    )
  );

  SELECT c.id INTO existing_id
  FROM carriers c
  WHERE c.tenant_id = tenant
    AND (
      c.id = seeded_id
      OR lower(c.name) LIKE '%apex star%'
    )
  ORDER BY
    CASE
      WHEN lower(c.name) LIKE '%apex star%' THEN 0
      ELSE 1
    END,
    c.created_at
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO carriers (
      id, tenant_id, name, naic, written_lines, portal_status, portal_login, phone, email,
      website, mailing_address, customer_service_phone, carrier_info, territory,
      preferred_submission, binding_authority, appetite_notes, appetite_rows,
      fixture_tag, active, created_at, updated_at
    ) VALUES (
      seeded_id,
      tenant,
      'Apex Star Reciprocal Exchange',
      '17742',
      '["HO","LANDLORD","BOP"]'::jsonb,
      'open',
      'Apex Star',
      '(888) 876-8005',
      'customerservice@apexstarins.com',
      'https://apexstarins.com',
      '6135 W. Sitka St., Tampa, FL 33634',
      '(888) 876-8005',
      info,
      'Florida',
      'portal',
      'limited',
      note,
      qrg_rows,
      'apex-star-reciprocal-2026-09',
      true,
      now(),
      now()
    );
    existing_id := seeded_id;
  ELSE
    UPDATE carriers
    SET
      name = CASE
        WHEN lower(trim(name)) IN (
          'apex star',
          'apex star insurance',
          'apex star insurance exchange',
          'apex star reciprocal'
        ) THEN 'Apex Star Reciprocal Exchange'
        ELSE name
      END,
      naic = coalesce(nullif(naic, ''), '17742'),
      written_lines = (
        SELECT coalesce(jsonb_agg(DISTINCT value), '[]'::jsonb)
        FROM jsonb_array_elements_text(
          coalesce(written_lines, '[]'::jsonb) || '["HO","LANDLORD","BOP"]'::jsonb
        ) AS t(value)
      ),
      portal_status = coalesce(nullif(portal_status, ''), 'open'),
      portal_login = coalesce(nullif(portal_login, ''), 'Apex Star'),
      phone = coalesce(nullif(phone, ''), '(888) 876-8005'),
      email = coalesce(nullif(email, ''), 'customerservice@apexstarins.com'),
      website = coalesce(nullif(website, ''), 'https://apexstarins.com'),
      mailing_address = coalesce(nullif(mailing_address, ''), '6135 W. Sitka St., Tampa, FL 33634'),
      customer_service_phone = coalesce(nullif(customer_service_phone, ''), '(888) 876-8005'),
      carrier_info = info,
      territory = coalesce(nullif(territory, ''), 'Florida'),
      preferred_submission = coalesce(nullif(preferred_submission, ''), 'portal'),
      appetite_notes = note,
      appetite_rows = (
        SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(coalesce(appetite_rows, '[]'::jsonb))
            WITH ORDINALITY AS t(elem, ord)
          WHERE elem->>'id' IS DISTINCT FROM 'apex-star-ho3-contacts-2026-09'
            AND elem->>'id' IS DISTINCT FROM 'apex-star-dp3-contacts-2026-09'
            AND elem->>'id' IS DISTINCT FROM 'apex-star-commercial-contacts-2026-09'
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
      notes = note,
      mobile_allowed = false,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, coastal_allowed,
      mobile_allowed, requires_opening_protection, require_replacement_cost,
      notes, created_at, updated_at
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
      tenant,
      'apex_star',
      'Apex Star Reciprocal Exchange',
      'fl_property',
      '["HO3","DP3","COMM_RES"]'::jsonb,
      '[]'::jsonb,
      '["FL"]'::jsonb,
      '[]'::jsonb,
      '["FL"]'::jsonb,
      'Apex Star',
      '(888) 876-8005',
      true,
      hard,
      soft,
      pref,
      'open',
      note,
      14,
      14,
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
