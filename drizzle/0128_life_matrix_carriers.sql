-- MATRIX Life carrier contact enrichment (Javy UW screenshots 2026-09-16).
-- Update-in-place by name/alias. Insert missing LIFE rows only when a tenant
-- has other carriers and the MATRIX name is absent. Never overwrite filled
-- website / phone / portal fields. Full MATRIX when spreadsheet provided.
--> statement-breakpoint
DO $$
DECLARE
  rec record;
  tenant uuid;
  existing_id uuid;
  note text;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      (
        'Americo',
        ARRAY['americo','americo financial life','americo life'],
        'https://www.americo.com',
        '800-231-0801',
        '800-231-0801',
        'https://portal.americoagent.com',
        'https://portal.americoagent.com',
        'Americo Agent Services 800-231-0801. Agent portal portal.americoagent.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Mutual of Omaha',
        ARRAY['mutual of omaha','moo','united of omaha','mutual of omaha insurance'],
        'https://www.mutualofomaha.com',
        '800-693-6083',
        '800-693-6083',
        'https://producer.mutualofomaha.com',
        'https://producer.mutualofomaha.com',
        'Mutual of Omaha producer portal producer.mutualofomaha.com. Sales support 800-693-6083. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Foresters',
        ARRAY['foresters','foresters financial','the independent order of foresters'],
        'https://www.foresters.com',
        '866-466-7166',
        '866-466-7166',
        'https://myezbiz.foresters.com',
        'https://myezbiz.foresters.com',
        'Foresters ezbiz / myezbiz.foresters.com. Sales support 866-466-7166. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Transamerica',
        ARRAY['transamerica','transamerica life','transamerica life insurance'],
        'https://www.transamerica.com',
        '877-234-4848',
        '877-234-4848',
        'https://www.agentnetinfo.com',
        'https://www.agentnetinfo.com',
        'Transamerica AgentNet agentnetinfo.com. Life / Final Expense desk 877-234-4848. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'SBLI',
        ARRAY['sbli','savings bank life','the savings bank mutual life','savings bank mutual life insurance company of massachusetts'],
        'https://www.sbli.com',
        '888-224-7254',
        '888-224-7254',
        'https://www.sbliagent.com',
        'https://www.sbliagent.com',
        'SBLI agent portal sbliagent.com. Brokerage 888-224-7254 option 1. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Banner Life',
        ARRAY['banner life','banner','lga','legal & general america','legal and general america'],
        'https://www.lgamerica.com',
        '800-839-5960',
        '800-839-5960',
        'https://www.lgamerica.com',
        'https://www.lgamerica.com',
        'Banner Life / LGA (Legal & General America). AppAssist 800-839-5960. Advisor site lgamerica.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'National Life Group',
        ARRAY['national life group','nlg','national life','national life insurance'],
        'https://www.nationallife.com',
        '800-906-3310',
        '800-906-3310',
        'https://www.nationallife.com',
        'https://www.nationallife.com',
        'National Life Group agent desk 800-906-3310 (NLGSalesDesk@nationallife.com). Portal via nationallife.com LOGIN/REGISTER. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Royal Neighbors',
        ARRAY['royal neighbors','royal neighbors of america','rna'],
        'https://www.royalneighbors.org',
        '800-627-4762',
        '800-627-4762',
        'https://agent.royalneighbors.org',
        'https://agent.royalneighbors.org',
        'Royal Neighbors agent portal agent.royalneighbors.org. Sales support 800-627-4762 option 1 then 5. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Fidelity & Guaranty',
        ARRAY['fidelity & guaranty','f&g','fidelity & guarantee','fidelity and guaranty','fidelity & guaranty life','fg life'],
        'https://www.fglife.com',
        '800-445-6758',
        '800-445-6758',
        'https://saleslink.fglife.com',
        'https://saleslink.fglife.com',
        'F&G (Fidelity & Guaranty) SalesLink saleslink.fglife.com. Contracting 800-445-6758. SalesLink help 888-513-8797. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'Corebridge',
        ARRAY['corebridge','corebridge financial','aig life'],
        'https://www.corebridgefinancial.com',
        '800-280-2011',
        '800-280-2011',
        'https://www.corebridgefinancial.com/Connext',
        'https://www.corebridgefinancial.com/Connext',
        'Corebridge Connext portal corebridgefinancial.com/Connext. Connext support 800-280-2011 option 1. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'American Amicable',
        ARRAY['american amicable','amam','am-am','american memorial','american-amicable','occidental life'],
        'https://www.americanamicable.com',
        '800-736-7311',
        '800-736-7311',
        'https://www.americanamicable.com',
        'https://www.americanamicable.com',
        'MATRIX column AMAM — American Amicable / Occidental family (Term Made Simple, Express Term). Agent line 800-736-7311. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      ),
      (
        'United Home Life',
        ARRAY['united home life','uhl','united heritage life','united home life insurance'],
        'https://www.unitedhomelife.com',
        '800-428-3001',
        '800-428-3001',
        'https://agentportal.unitedhomelife.com',
        'https://agentportal.unitedhomelife.com',
        'United Home Life (UHL) agent portal agentportal.unitedhomelife.com. Life Contact Center 800-428-3001. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).'
      )
    ) AS t(name, aliases, website, phone, agent_phone, portal_url, agent_portal_url, carrier_info)
  LOOP
    note := rec.carrier_info;

    FOR tenant IN
      SELECT DISTINCT c.tenant_id FROM carriers c
    LOOP
      SELECT c.id INTO existing_id
      FROM carriers c
      WHERE c.tenant_id = tenant
        AND (
          lower(trim(c.name)) = lower(rec.name)
          OR lower(trim(c.name)) = ANY (rec.aliases)
          OR EXISTS (
            SELECT 1
            FROM unnest(rec.aliases) AS alias
            WHERE lower(trim(c.name)) = alias
               OR lower(trim(c.name)) LIKE alias || ' %'
          )
        )
      ORDER BY
        CASE WHEN lower(trim(c.name)) = lower(rec.name) THEN 0 ELSE 1 END,
        c.created_at
      LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO carriers (
          id, tenant_id, name, written_lines, portal_status,
          website, phone, agent_phone, portal_url, agent_portal_url,
          carrier_info, appetite_notes, fixture_tag, active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          tenant,
          rec.name,
          '["LIFE"]'::jsonb,
          'open',
          rec.website,
          rec.phone,
          rec.agent_phone,
          rec.portal_url,
          rec.agent_portal_url,
          rec.carrier_info,
          'MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.',
          'life-uw-matrix-2026-09',
          true,
          now(),
          now()
        );
      ELSE
        UPDATE carriers
        SET
          written_lines = CASE
            WHEN written_lines @> '["LIFE"]'::jsonb THEN written_lines
            ELSE coalesce(written_lines, '[]'::jsonb) || '["LIFE"]'::jsonb
          END,
          website = coalesce(nullif(website, ''), rec.website),
          phone = coalesce(nullif(phone, ''), rec.phone),
          agent_phone = coalesce(nullif(agent_phone, ''), rec.agent_phone),
          portal_url = coalesce(nullif(portal_url, ''), rec.portal_url),
          agent_portal_url = coalesce(nullif(agent_portal_url, ''), rec.agent_portal_url),
          carrier_info = CASE
            WHEN coalesce(carrier_info, '') = '' THEN rec.carrier_info
            WHEN carrier_info ILIKE '%MATRIX Life appetite%' THEN carrier_info
            ELSE carrier_info || E'\n' || rec.carrier_info
          END,
          appetite_notes = CASE
            WHEN coalesce(appetite_notes, '') = '' THEN
              'MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.'
            WHEN appetite_notes ILIKE '%MATRIX Life appetite%' THEN appetite_notes
            ELSE appetite_notes || E'\nMATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.'
          END,
          updated_at = now()
        WHERE id = existing_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
