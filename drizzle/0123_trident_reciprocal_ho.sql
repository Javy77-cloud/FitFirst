-- Trident Reciprocal Exchange: desk carrier + HO appetite (min Cov A $300k) + quote-gate catalog.
-- Idempotent: reuse an existing Trident / Trident Reciprocal row; never insert a duplicate name.
-- Post-merge: `drizzle-kit migrate` (or apply this file). Optional `npm run appetite:import`
-- refreshes the full FL specialty pack from CSV (this file already upserts the Trident slug).
--> statement-breakpoint
DO $$
DECLARE
  tenant uuid := '11111111-1111-4111-8111-111111111111';
  seeded_id uuid := '33333333-3333-4333-8333-333333333340';
  existing_id uuid;
  note text := 'FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k.';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant) THEN
    RETURN;
  END IF;

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
      'Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH.',
      'Florida',
      'portal',
      'limited',
      note,
      '[{"id":"trident-ho3-min-cova-2026","dateRequested":"2026-06-17","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k."}]'::jsonb,
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
      carrier_info = coalesce(nullif(carrier_info, ''), 'Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH.'),
      territory = coalesce(nullif(territory, ''), 'Florida'),
      preferred_submission = coalesce(nullif(preferred_submission, ''), 'portal'),
      appetite_notes = CASE
        WHEN coalesce(appetite_notes, '') = '' THEN note
        WHEN appetite_notes ILIKE '%300,000%' OR appetite_notes ILIKE '%$300k%' THEN appetite_notes
        ELSE appetite_notes || E'\n' || note
      END,
      appetite_rows = CASE
        WHEN appetite_rows @> '[{"id":"trident-ho3-min-cova-2026"}]'::jsonb THEN appetite_rows
        ELSE coalesce(appetite_rows, '[]'::jsonb) || '[{"id":"trident-ho3-min-cova-2026","dateRequested":"2026-06-17","lob":"HO3","roofAge":"","waterHeater":"","hvac":"","electrical":"","claimsHistory":"","acceptDecline":"accept","notes":"FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k."}]'::jsonb
      END,
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
      notes = CASE
        WHEN coalesce(notes, '') = '' THEN note
        WHEN notes ILIKE '%300,000%' OR notes ILIKE '%$300k%' THEN notes
        ELSE notes || E'\n' || note
      END,
      updated_at = now()
    WHERE tenant_id = tenant AND carrier_id = existing_id AND line_of_business = 'HO';
  ELSE
    INSERT INTO appetite_rules (
      tenant_id, carrier_id, line_of_business, min_cov_a, coastal_allowed,
      mobile_allowed, requires_opening_protection, require_replacement_cost,
      notes, created_at, updated_at
    ) VALUES (
      tenant, existing_id, 'HO', 300000, true, false, false, false, note, now(), now()
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
      NULL,
      true,
      '["state!=FL","mobile_home","min_cov_a:300000"]'::jsonb,
      '["older_roof"]'::jsonb,
      '["fl_single_family","quoterush"]'::jsonb,
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
