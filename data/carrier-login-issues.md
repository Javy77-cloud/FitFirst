# Carrier login issues

Running list of insurance carriers whose **quote-pulling bots failed LOGIN or portal access** (cannot authenticate, captcha, 2FA / MFA, account locked, session expired, password expired, credentials rejected, NordPass autofill, missing portal credentials, CloudFront block, wrong NordPass item, wrong user session).

This is not the missing-question list (`carrier_missing_questions`) and it does not record UW declines.

## Where it lives

| Store | Path |
| --- | --- |
| Event log (canonical, seeded) | `data/carrier-login-issues.ndjson` |
| Durable append mirror | Postgres table `carrier_login_issues` (migration `drizzle/0148_carrier_login_issues.sql`) |
| Desk view | `/developer/carrier-login-issues` and `/settings/developer-hub/carrier-login-issues` |
| Bot append API | `POST /api/quote-bots/carrier-login-issues` |

Reads merge the NDJSON file and the table, deduped by event `id`. Day one is not empty: the NDJSON file is seeded from portal notes already in this repo, including the 2026-09-21 Javy carrier-portal login/access list. When a note named the attempt clock (Mario Cromartie DP3, 2026-09-09), `occurred_at` is that timestamp. When a script recorded the failure but not the clock, `occurred_at` is `2026-09-14T17:03:06.000Z` (the commit that added the note) or `2026-09-13T16:00:00.000Z` for the Gloria wave. The 2026-09-21 date is the handoff that called these standing fights; it is not rewritten onto older attempt clocks. New failures append a line and insert a row when Postgres is up. If the filesystem is read-only, the table still keeps the event. Live bot appends leave `standing` false.

## Event schema (one JSON object per line)

```json
{
  "id": "uuid",
  "carrier_name": "The General",
  "carrier_id": "3381e7d5-1f01-4523-8b8d-957aa1cab371",
  "lob": "AUTO",
  "error_message": "exact portal / bot text",
  "error_category": "password_expired",
  "occurred_at": "2026-09-14T17:03:06.000Z",
  "source": "scripts/ff-general-password-expired.ts",
  "deal_id": null,
  "standing": true
}
```

`carrier_id` is the desk `carriers.id` when one is known. `error_category` is one of:

`cannot_authenticate`, `captcha`, `mfa_2fa`, `mfa_loop`, `account_locked`, `session_expired`, `password_expired`, `credentials_rejected`, `autofill_failed`, `missing_credentials`, `access_blocked`, `wrong_vault_item`, `wrong_session`.

`standing` is true when the handoff treated the failure as a standing fight (skipped until fixed, holding for Javy, known portal access wall, or the note says `Standing:`). Live quote-bot appends store `standing: false`.

Do not put passwords or vault secrets in `error_message`.

## Rollup

Grouped by carrier id (or normalized name) + `error_category`:

- `count` — events in the group
- `first_seen` / `last_seen` — ISO timestamps
- `standing` — `true` when any event in the group is a standing fight
- `recurring` — `true` when `count > 1`, when two events of that carrier + category fall inside 14 days (`RECURRING_WINDOW_DAYS`), or when the group is standing

## How a quote bot appends

Authenticated `POST /api/quote-bots/carrier-login-issues` (desk session cookie or `Authorization: Bearer` API token):

```json
{
  "carrier_name": "Progressive",
  "carrier_id": "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
  "error_message": "credentials rejected after NordPass autofill",
  "lob": "AUTO",
  "occurred_at": "2026-09-21T18:04:00.000Z",
  "deal_id": null
}
```

`error_category` is optional. When omitted, the message is classified. Text that is not a login failure (UW decline, missing sheet question, "no login wired") is rejected and not stored.

The shop loop (`shopDealQuotes` → `portal.submitQuote`) and `recordManualAttempt` call the same recorder when the portal result or the attempt note classifies as a login failure.

## Routing flag (default OFF)

`isCarrierLoginBlocked(carrier)` returns false unless `FF_BLOCK_CARRIER_LOGIN_ISSUES=1`. Production markets are not skipped because of this list. TODO: leave the flag off until someone chooses to route around recurring login failures. When the flag is on, only a **recurring** login issue skips the portal (a repeat, or a standing fight). A one-off that is not standing does not.
