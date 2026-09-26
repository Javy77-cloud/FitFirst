-- Gloria Martinez deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
-- One-time data repair. Do not run from the app. Review, then run by hand.
--
-- What is wrong today (read 2026-09-26):
--   shop_products: homeowners, landlord, homeowners~88uvyj
--   quote_sheets.line = home
--     form = DP3 (dec), quoting_form stamped HO3 because homeowners owns the plain line
--     address1 = 10358 NW 30th TER, Doral 33172, occupancy Tenant, coverage_a 309000
--     mailing_address = 16021 NW 79Th CT  (owner mailing, not the rental)
--   quote_sheets.line = home~landlord
--     quoting_form = DP3, address1 = 10358 Northwest 30th Terrace, facts blank
--     (a copy of the rental, source "Deal address")
--   quote_sheets.line = home~homeowners~88uvyj
--     quoting_form = HO3, address1 = 16021 Northwest 79th Court, Miami Lakes 33016
--     occupancy Owner, coverage_a 533000
--   risks product_key null → 10358 Doral, Tenant, coverage_a 309000
--     (synced off the DP3 dec; the app used to treat this row as the first HO3)
--   risks product_key homeowners~88uvyj → 16021 Miami Lakes, Owner, coverage_a 533000
--   deal insured fields (mailing_address) = 8944 Adriatico Lane, Kissimmee 34747
--   deal mailing (contact_mailing_*) = 16021 Northwest 79th Court, Miami Lakes 33016
--   mailing_address__verify fingerprint is 16021 and does not match 8944.
--     Do not overwrite 8944 from this script. Confirm that street on the desk first.
--
-- The app now:
--   shows the DP3 dec (home) on the landlord tab, insured 10358, mailing 16021
--   shows the HO3 copy on homeowners~88uvyj, insured 16021
--   does not show 10358 or 16021 as the first HO3's insured address
--   writes a DP3 fill onto a landlord-keyed risk instead of the unscoped row
--   refuses to overwrite the unscoped row when the first HO3 saves a different street
--
-- This script only claims the existing 10358 risk for landlord so the row is
-- keyed even before the next DP3 save. It does not move sheet lines, does not
-- invent an 8944 risk, and does not copy 16021 onto DP3.

begin;

update risks
set product_key = 'landlord',
    updated_at = now()
where deal_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and id = 'fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3'
  and product_key is null
  and address1 = '10358 NW 30th TER';

-- Align the shop stamp on the DP3 dec with the extracted form.
-- The landlord tab already prefers `form` over `quoting_form`. This keeps
-- a later fill from reading the line as HO3.
update quote_sheets
set values = jsonb_set(values, '{quoting_form,value}', '"DP3"', true),
    updated_at = now()
where deal_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and line = 'home'
  and values->'form'->>'value' = 'DP3'
  and values->'quoting_form'->>'value' = 'HO3';

commit;
