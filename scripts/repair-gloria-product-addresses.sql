-- Gloria Martinez deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
-- One-time data repair. Do not run from the app. Review, then run by hand.
--
-- Pins the app now shows (read 2026-09-26, Javy correction):
--   homeowners (HO3) insured/risk = 10358 NW 30th TER, Doral FL 33172
--     unscoped risk fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3 stays product_key null
--     quote_sheets.line = home, sheet_product homeowners, quoting_form HO3
--     extracted form is DP3; that does not move this street onto landlord
--   homeowners~88uvyj (HO3 copy, chip 803-16021) = 16021 Northwest 79th Court,
--     Miami Lakes FL 33016. Do not merge this tab into the Doral HO3.
--   landlord (DP3) sheet home~landlord address1 is a "Deal address" copy of
--     10358. The tab does not use that copy. This script clears only that
--     copied street so a later save cannot clone a second 10358 risk.
--   Deal Details insured (mailing_address) stays 8944 Adriatico Lane,
--     Kissimmee FL 34747. It is not 16021 and it is not a product risk.
--   Deal mailing (contact_mailing_*) stays 16021. mailing_same_as_insured
--     is true even though the streets differ, and mailing_address__verify
--     fingerprints 16021. Clear both so Deal Details does not treat 8944
--     as confirmed-16021.
--
-- Does not insert an 8944 risk. Does not copy 16021 onto the Doral HO3.
-- Does not change quoting_form on the home line.

begin;

update desk_custom_field_values
set value = 'false'
where record_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and field_key = 'mailing_same_as_insured'
  and value = 'true';

update desk_custom_field_values
set value = ''
where record_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and field_key = 'mailing_address__verify'
  and value like '%16021 northwest 79th ct%';

update quote_sheets
set values = values
    || jsonb_build_object(
      'address1', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'Deal address'),
      'city', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'Deal address'),
      'state', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'Deal address'),
      'zip', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'Deal address')
    ),
    updated_at = now()
where deal_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and line = 'home~landlord'
  and values->'address1'->>'sourceLabel' = 'Deal address'
  and values->'address1'->>'value' ilike '10358%';

commit;
