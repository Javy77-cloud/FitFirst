# FitFirst coordination

Shared locks for parallel work on this Origin repo. Product name is **FitFirst**. This is not a Zoho clone. Do not call live Zoho, Gmail, Outlook, Yahoo, IMAP, or Twilio.

## Locked (do not change)

- Ana Dib HO3 fixture: `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` and the Ana rows in `src/lib/db/seed.ts`.
- Filter-first matching: `src/lib/appetite/match.ts` and `src/lib/appetite/match.test.ts`.
- Additive SQL only. New tables go in a new `drizzle/0004_*` (or later) migration on this slice. Do not edit `drizzle/0000_init.sql` or `drizzle/0001_*`.
- Every new table has `tenant_id`. Runtime stays single-tenant (`TENANT_ID`). No isolation, billing, or credential vault.
- Restyle only through `--ff-*` in `src/app/globals.css`.

## Claimed by TEMPLATES + TRIGGERS + agency branding (this slice)

Owner: email templates + triggers (`cursor/email-templates-triggers-7f74`).

Client-facing mail only. Internal desk alerts stay in-app / pop-up. **Never email the broker** for CRM chores. Never email Ana Dib.

| Surface | Owner notes |
| --- | --- |
| `/settings/email-templates` | Template library: create / edit / duplicate. EN + ES on every client template. |
| `/settings/email-triggers` | Enable/disable, delay, template, send-from connected inbox. |
| `src/lib/templates/**` | Merge fields, locale pick, schedule, send-when-connected job runner. |
| `email_templates`, `email_triggers`, `email_send_jobs`, `email_send_accounts` | All `tenant_id`. Jobs hang off **won date / policy expiration**, not pipeline stage. |
| `contacts.preferred_language` | Spanish → ES. English, Creole, or blank → EN. |
| `deals.won_at`, `deals.archived_at` | Won date is the schedule anchor. ARCHIVE must not cancel jobs. |
| `src/lib/db/seed-email-templates.ts` | Seeds example copy + one queued demo on a **non-Ana** contact. |
| `/settings/agency` | Admin: agency name, logo, default color/font/density, default column layout. |
| `/settings/email-signatures` | Admin: EN + ES signature. Merge `{{signature}}`. |
| `/settings/my-desk` | Per-agent colors, fonts, density, column layout. Does not touch agency chrome. |
| `agency_brand`, `email_signatures`, `agent_ui_prefs` | Two-layer persistence. `0005_agency_brand_agent_prefs.sql`. |
| Top-left rail | Agency name + logo. Product name is not the corner brand. |

### Send path

Work-email / Zoho Mail own `email_connections` and `src/lib/email/*`. This slice **does not recreate those tables**.

- `email_send_accounts` is a thin send-from catalog (Google / Outlook / Yahoo / Zoho Mail / IMAP) so this branch boots without the inbox slice.
- When `email_connections` exists, the runner prefers it and maps `zoho` → Zoho Mail, `other` → IMAP.
- Connector `send()` may only `would_send`. Jobs still move queued → sent after a connected demo inbox is selected.
- If no inbox is connected, the job stays **queued** and the UI shows **connect email to send**.
- No Twilio, no FitFirst-owned mailbox, no Campaigns vendor.

### Shared hooks (additive)

- `bindDeal` in `src/app/actions/crm.ts` calls `scheduleWonClientEmails` + `schedulePolicyRenewalEmails`. Won-path / bind slices should keep that call (or call the same exports).
- `archiveDeal` sets `archived_at` only. Do **not** delete or cancel `email_send_jobs`.
- Renewal 60 / 30 writes an in-app `review_tasks` row for the broker **and** an optional client email. Do not create a second tasks table.
- Attempted sends are logged on `client_history` (`email_queued` / `email_sent` / `email_failed`) and on `email_send_jobs`.
- Thin `/contacts/[id]` and `/policies/[id]` show that timeline. Account 360 / ops own the richer record pages — keep the history events.

### Seed rules

- Seeded bodies are **example copy Javy can edit**. Brand: Javier Garcia Insurance, phone 321-429-1182. Email from the connected inbox. Do not invent a street address.
- Do not mass-send on migrate. One queued demo on Marcus Bell only. Do not email Ana.

## Do not

- Email the desk user.
- Change the Ana fixture or filter-first matching.
- Implement real OAuth if not already stubbed.
- Build a native app or rater APIs.

## Other slices (do not revert)

- Work email inbox — `/email`, `email_connections` / threads / messages / outbox.
- BYO Zoho Mail + Calendar — fifth provider `zoho`.
- QA + settings — desk identity on `/settings`. Keep their Agency form; add a link to Email templates.
- Reports + automations — `would_send_logs` is in-app would-send, not this client mail path.
- Agency ops — campaigns / SMS stubs. Client review / check-in / renewal mail lives here, not in Campaigns.
- Roles + commissions — `users` / `ff_actor` / full login. This slice uses a **minimum Admin/Agent cookie** (`ff_desk_role`) until that lands. Prefer `getActor` when present. Do not recreate `users`.
- CRM UI column picker (`bc-1fc5b3be`) — owns the in-list picker. Persist via `saveListColumnLayout` (`listKey`, `scope=agency|agent`, `keys`) to `agency_brand.default_column_layout` or `agent_ui_prefs.column_layout`. Settings checkboxes write the same JSON. Do not fork a second picker or a second store.
