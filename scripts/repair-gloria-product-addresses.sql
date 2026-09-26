-- Gloria Martinez deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
-- One-time data repair. Do not run from the app. Review, then run by hand.
--
-- Pins the app now shows (read 2026-09-26, Javy correction #2):
--   homeowners (the HO3 labeled 10358) risk/location = 10358 NW 30th TER,
--     Doral FL 33172. Chip and unscoped risk stay there.
--     Insured address for that product and Deal Details = 8944 Adriatico
--     Lane, Kissimmee FL 34747. Not 10358. Not 16021.
--     unscoped risk fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3 stays product_key null
--     quote_sheets.line = home is not rewritten (address1, mailing, quotes)
--   homeowners~88uvyj (HO3 803-16021) = 16021 Northwest 79th Court,
--     Miami Lakes FL 33016. Do not rewrite that sheet, risk, or quotes.
--   landlord (DP3) sheet home~landlord address1 is a "Deal address" copy of
--     10358. The tab does not use that copy. This script clears only that
--     copied street so a later save cannot clone a second 10358 risk.
--   Deal Details insured (mailing_address) stays 8944 Adriatico Lane.
--   contact_mailing_* holding 16021 is the Miami Lakes risk, not the
--     insured address. mailing_same_as_insured is true, so that street
--     is what the insured field presents. Clear contact_mailing_*,
--     set mailing_same_as_insured false, and clear the 16021 verify
--     fingerprint on mailing_address.
--   home sheet mailing_address and applicant_address are the same 16021
--     cross-link. Clear those cells only. address1 stays 10358.
--
-- Does not insert an 8944 risk. Does not change home~homeowners~88uvyj,
-- its risk row, or its quotes. Does not change quoting_form.

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

update desk_custom_field_values
set value = ''
where record_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and field_key in (
    'contact_mailing_address',
    'contact_mailing_unit',
    'contact_mailing_city',
    'contact_mailing_state',
    'contact_mailing_zip',
    'contact_mailing_county',
    'contact_mailing_address__verify'
  )
  and (
    field_key <> 'contact_mailing_address'
    or value ilike '16021%'
    or value like '%16021 northwest 79th ct%'
  );

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

update quote_sheets
set values = values
    || jsonb_build_object(
      'mailing_address', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'product isolation'),
      'mailing_city', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'product isolation'),
      'mailing_state', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'product isolation'),
      'mailing_zip', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'product isolation'),
      'applicant_address', jsonb_build_object('value', '', 'status', 'missing', 'source', 'agent', 'sourceLabel', 'product isolation')
    ),
    updated_at = now()
where deal_id = '03dccdd7-db06-4c89-9b7a-cf0a2064d044'
  and line = 'home'
  and (
    values->'mailing_address'->>'value' ilike '16021%'
    or values->'applicant_address'->>'value' ilike '16021%'
  );

commit;
