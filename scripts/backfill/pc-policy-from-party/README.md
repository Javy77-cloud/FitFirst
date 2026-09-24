# P&C policy backfill from contact or account

Fills blank P&C policy fields from the linked person (personal lines) or business (commercial lines). Does not overwrite a value that is already stored. Leaves every commission field blank. Does not invent premium, carrier, policy number, dates, limits, deductibles, VINs, construction, status, or renewal dates.

Life, Health, Marketplace, and Medicare policies are out of scope. Renewal dates (Marketplace / Medicare / P&C) and Marketplace / Medicare insured location are separate backfills. This script does not update `renewal_date`.

No schema changes. No `db:seed`. Do not point this at a database you have not reviewed the preview for.

The scanned, filled, and flagged counts are known only after these queries run on the live database. Nothing in this folder hard-codes those counts.

## How a policy is matched

1. Personal lines use `policies.contact_id`. Commercial / business lines use `policies.account_id`.
2. If that foreign key is null, the script uses the contact or account already stored on the policy's deal.
3. If both are null, it matches the deal's named insured (or a named-insured custom value already stored on the policy) to exactly one party. People match First Last, including `Last, First` and all-caps `LAST FIRST`. Businesses match the account name exactly, then legal name only when the account name matched nobody.
4. Zero matches or more than one match: nothing is copied. The flag list says unmatched or ambiguous.

A personal policy is never filled from an account. A commercial policy is never filled from a contact. Example accounts are not a source.

Named insured for a person is First Last from `contacts.first_name` and `contacts.last_name` as stored. A business keeps `accounts.name`.

## Field mapping

| Policy field | Personal source | Commercial source | When it is copied |
| --- | --- | --- | --- |
| `contact_id` | the resolved contact | — | only when the policy contact is null and step 2 or 3 found exactly one contact |
| `account_id` | — | the resolved account | only when the policy account is null and step 2 or 3 found exactly one account |
| `premises_address`, `premises_city`, `premises_state`, `premises_zip` | `contacts.mailing_address`, `city`, `state`, `zip` (the contact street; the separate mailing custom fields are not this) | `accounts.primary_address1`, `primary_city`, `primary_state`, `primary_zip`. If primary is empty and `mailing_same_as_primary` is true, the mailing columns | residence forms (HO3, HO4, HO5, HO6, HO8, renters, policy type Home with no other form) and commercial lines. A `policies.location_id` address wins on every P&C line. Parts already stored are not replaced. If any stored part disagrees with the source, nothing is copied |
| Custom `phone`, `email`, `secondary_phone`, `date_of_birth` / `dob` | the same contact column | `phone`, `email` on the account | only when that key already exists on the policy field catalog or as a policy custom value, and the value is blank |
| Custom `named_insured`, `insured_name`, `primary_named_insured` | First Last | account name | same custom-field rule |
| Custom `mailing_address`, `city`, `state`, `zip` | contact street and city / state / ZIP | account mailing street and city / state / ZIP | same custom-field rule. This does not turn a mailing custom field into the premises |
| Custom `contact_mailing_address` and its city / state / ZIP | the contact's custom value for the same key | — | same custom-field rule |
| Custom `business_name`, `legal_name`, `dba`, `entity_type`, `website` | — | the same account column | same custom-field rule |
| Custom `ein` / `fein` | — | `accounts.ein` only when it is a plain 9-digit FEIN | encrypted `ein_enc` is never copied |
| Custom `primary_address1` / `business_address` / `primary_address` and `primary_city` / `primary_state` / `primary_zip` | — | the account primary address columns | same custom-field rule |
| `drivers.date_of_birth` | `contacts.date_of_birth` | — | the driver is already linked to that contact, or the driver's First Last matches that one contact and the driver has no contact link |

`policies` has no columns for phone, email, date of birth, named insured, FEIN, entity type, or business name. Those are filled only when the policy module already has the custom field. This script does not add catalog fields.

Landlord / DP, flood, and an HO line with no form do not copy the contact street into insured location. Auto, motorcycle, RV, and boat do not copy a garaging address from the contact. Those blanks are flagged.

## Excluded fields

These are never filled. If they are blank, they are flagged. Commission is the exception: it is never filled and never flagged.

| Field | Why it is excluded |
| --- | --- |
| Premium | not on the contact or account |
| Carrier | not on the contact or account |
| Policy number | not on the contact or account |
| Effective date, expiration date | not on the contact or account |
| Renewal date | not on the contact or account; other backfill owns renewal dates |
| Status | not on the contact or account |
| Coverage A (dwelling lines) and coverage limits | not on the contact or account |
| AOP, hurricane, comprehensive, and collision deductibles | not on the contact or account |
| VIN | not on the contact or account |
| Year built, construction, roof year, roof covering, square feet, stories | not on the contact or account |
| `commission_family`, `commission4_pct`, `commission4`, and any custom key containing `commission` | the agent sets commission later |

Blank means NULL, or text that is empty or whitespace only. Numeric 0 is a stored value and is left alone.

A policy layout field that is still blank, is not in the mapping, and is not commission is flagged as having no one-to-one source.

## Run

Use `psql`. The Neon SQL editor does not support `\ir`.

```bash
# 1. Preview. Read-only. Rolls back.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/backfill/pc-policy-from-party/01-preview.sql

# 2. Backfill, after the preview looks right.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/backfill/pc-policy-from-party/02-backfill.sql

# 3. Flag CSV (policy_number, party_name, field, reason).
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --csv \
  -f scripts/backfill/pc-policy-from-party/03-flag-export.sql \
  > pc-policy-flags.csv

# 4. Optional. One completed note per policy that still has flags.
#    Re-run to refresh the same note. Does not create a notification.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/backfill/pc-policy-from-party/04-notes.sql
```

Preview prints, in order: the P&C scope count, a breakdown by party / line / link, fill totals per field, one row per value that would be copied, and the flag list. Run the flag export after the backfill if you want the CSV to describe what is still blank. The preview flag list is the same projection and does not require the backfill to have run.

`04-notes.sql` writes `activities.kind = 'note'` with `status = 'completed'` and an `activity_logs` row so the note shows on the policy timeline. Idempotency key: `source_id = pc-party-blank-fields:<policy uuid>`. It does not insert into `alerts`.
