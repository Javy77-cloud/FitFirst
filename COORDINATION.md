# FitFirst coordination — TEST-DESK

This file is the handshake for additive desk work. Do not invent a second CRM shape. Every module talks: Lead → Deal → Contact/Business → Policy.

Runtime stays single-tenant (`TENANT_ID`). New tables carry `tenant_id`. Checked-in SQL is under `drizzle/`. Restyle through `--ff-*` tokens only.

## Locked lifecycle (do not invent a different funnel)

1. A lead arrives (manual, email/social stub, or a dropped dec / wind mit / 4-point / inspection). Create or match a Lead (name + phone or email when present; **never duplicate**).
2. Convert that Lead into a Deal. The Deal is the shopping record. Source docs (dec, 4-point, wind mit, inspections) live on Deal attachments. Fill Quote Sheet blanks from those docs (yellow missing / blue CHECK). **Do not create a Policy from a quote.**
3. When quotes are finalized: room on the Deal for issued-quote PDFs **plus** a ranked quote-results note (cheapest first). Quotes never become Policies.
4. Bind / Closed Won: Deal produces a Contact (personal lines) or a Business/Account (commercial). Copy matching fields so the agent does not retype. Then create **one Policy per bound line**, attached to that Contact or Business. Policy exists only after accept/apply (status Bound / Pending / Active — never Quote-only).
5. Every Policy is its own record. Contact and Business show policy counts: **lifetime** + **active/bound/pending**. Same person can have personal Contact policies **and** be linked to a Business.
6. Client status: Contact/Business is **Client** if any related policy is Active, Bound, or Pending; otherwise not a client. **Former Client** only if they once had one and now have zero in-force.
7. Tasks, Meetings, and Calls assign to a **Contact and/or Policy (and Business)**. Every one writes an `activity_logs` row with those FKs so the log is not an orphan. Bind/lifecycle screens show the activity timeline on Contact, Business, and Policy. **Do not build a softphone** — agency-ops owns dialing / calendar UI.

## TEST-DESK owns (this slice)

Owner: TEST-DESK (`cursor/test-desk-lifecycle-63b0`).

- Lifecycle wiring: lead match, lead→deal convert, bind→contact/account + policy, policy counts, client status
- Clickable record pages: `/leads/[id]`, `/contacts/[id]`, `/accounts`, `/accounts/[id]`, `/policies/[id]`
- Deal document **slots**: `source_doc` vs `quote_pdf` (shopping). Policy file slots (`policy_file`) are issued dec / complete / ID after bind — not shopping docs
- Ranked quote-results note on the deal (`deals.quote_results_note`)
- Thin Quote Sheet **display + blanks-only fill from already-extracted fields** (extension point)
- Get Started click-path checklist (`/get-started`)
- Personal HO click-through seed **besides Ana** (Elena Ruiz, Melbourne)
- Activity timeline on Contact / Business / Policy: consume ops `activities` (task / meeting / call) + require `activity_logs` with related-record FKs. Add `account_id` so a Business can own the same activity.

### Files owned

- `COORDINATION.md` (lifecycle + click path; other slices append their sections)
- `src/lib/lifecycle/**`
- `src/lib/db/seed-lifecycle.ts`
- `src/app/get-started/**`
- `src/app/leads/[id]/**`
- `src/app/contacts/[id]/**`
- `src/app/accounts/**`
- `src/app/policies/[id]/**`
- `drizzle/0002_test_desk_lifecycle.sql`
- `drizzle/0003_test_desk_activity_fks.sql`
- `src/app/actions/activities-desk.ts`
- `src/components/activity-timeline.tsx`
- `fixtures/sample-melbourne-ho-dec.txt`

### Shared files (additive only)

- `src/lib/db/schema.ts` — `accounts`, `contact_accounts`, `quote_sheets` (same shape as Quote Sheet slice), document `slot` / `policy_id` / nullable `risk_id`+`deal_id`, deal `account_id` + `quote_results_note`, policy `account_id` + nullable `contact_id`, contact `active_policy_count`
- `src/lib/db/queries.ts` — workspace loaders + counts
- `src/lib/db/seed.ts` — calls `seedLifecycleDemo()` after Ana; **does not change Ana rows**
- `src/lib/fixtures/ids.ts` — `4444…` Elena / business IDs only
- `src/lib/domain.ts` — policy / client / document-slot constants + consumed Quote Sheet types
- `src/app/actions/crm.ts` — match-on-create, bind copies fields, never inserts a policy from a quote
- `src/app/actions/documents.ts` — slot-aware uploads
- `src/app/actions/lifecycle.ts` — drop-packet, finalize quotes, fill sheet blanks, policy files
- Deal / lead / contact / policy list pages — links, slots, counts
- `src/components/app-shell.tsx` — Get Started + Businesses
- `src/app/page.tsx` — Get Started + Elena path + Ana shop
- `src/app/globals.css` — `--ff-check` / `--ff-check-bg` only

## Quote Sheet / pipeline / Chrome Fill (mid-flight — do not rewrite)

Consume their types. Leave extension points. Do **not** restyle `src/lib/quote-sheet/apply.ts`, extraction jobs, pipeline boards, or `extensions/fill/**`.

| Slice | Consume / leave |
| --- | --- |
| Quote Sheet ingest (`cursor/quote-sheet-desk-81c7`) | `QuoteSheetFieldValue` `{ value, status: missing\|check\|confirmed, source: blank\|agent\|extracted\|seed\|javy }`. Table `quote_sheets(deal_id, line, values)`. Fill Quote Sheet is **in the product** (blanks only; never overwrite agent/javy). Photo OCR hook stays theirs. Super-Copy JSON shape `kind: "fitfirst.sheet"` is the paste packet. |
| Quote-aware pipeline (`cursor/quote-aware-pipeline-3c3e`) | Keep `deals.pipeline_stage`. Do not create a second kanban. Closed Won = bind in this slice. |
| Chrome Fill (`cursor/chrome-fill-extension-77de`) | Reads Super-Copy / sheet JSON. Do not build portal macros. |
| QA + Settings Get Started (`cursor/qa-settings-get-started-12e1`) | They own `desk_settings` / `onboarding_items`. This slice’s `/get-started` is the **lifecycle click path**. On merge, keep both checklists or nest theirs under Settings. |
| Account 360 | Reuse `documents` + `review_tasks`. `documents.contact_id` is additive. Do not fork a files table. |
| CRM UI bind/history | Bind remains the **only** path that inserts a policy from a deal. |
| Agency operating tools (`cursor/agency-operating-tools-e272`) | Owns `/calendar`, `/tasks`, Google Calendar stub, **softphone / dialer**. Consume `activities` `{ kind: task\|meeting\|call, contact_id, deal_id, policy_id }`. TEST-DESK adds `account_id` + `activity_logs` (required). Do not restyle their calendar or build a phone. On merge, keep one `activities` table and add `account_id` if missing. |

Ana Home Coverage A **$321,000** (`source: javy`) is confirmed. Never flag it CHECK. Never overwrite it. Do not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Do not change `src/lib/appetite/match.ts`.

## Journal note

This branch adds `0002_test_desk_lifecycle`. Quote Sheet, QA, pipeline, Account 360, and others also used `0002` on their branches. Reconcile `drizzle/meta/_journal.json` on merge; keep every SQL file. `quote_sheets` is created here with the Quote Sheet slice’s column shape so the desk boots before that merge.

## Exact click path (Javy — run this as soon as it boots)

After `npm run db:migrate && npm run db:seed` (or `docker compose up --build`):

### Seeded personal-lines path (already bound — click through, no retyping)

1. **Get Started** (`/get-started`) — this checklist.
2. **Leads** → open **Ruiz, Elena** (Melbourne HO drop). Status converted. Phone + email present.
3. Click **Open deal** → **Ruiz · Melbourne HO3** (`/deals/<elena-deal>`).
4. Confirm breadcrumb: Lead Ruiz → this Deal → Contact Ruiz → HO3 Policy.
5. **Documents** tab (`?tab=documents`): **Source documents** (dec + wind mit) are labeled separately from **Issued quote PDFs**. Tabs are URL links so they work without client JS.
6. **Quote Sheet** tab (`?tab=quote-sheet`): yellow = missing, blue = CHECK. Seeded dwelling fields are confirmed. `coverage_a` is on the sheet for Elena only — Ana’s $321,000 is untouched.
7. **Quotes** tab (`?tab=quotes`): ranked quote-results note, cheapest first. Two quote PDF slots. No policy was created from those quotes.
8. Deal stage is **bound**. Click **Contact** → Elena Ruiz. Status **Client**. Counts: lifetime **1**, in-force **1**. Linked business **Ruiz Tile LLC** (commercial book is empty — she can hold personal policies and a business link).
9. Click the **HO3 policy** → issued policy files (dec / ID). These slots are not shopping docs.
10. On **Contact**, **Policy**, and **Business** scroll to **Activity timeline**. Seeded: bind log, 30-day task (Contact+Policy), meeting, logged call (not a dialer), and a Ruiz Tile LLC task (Contact+Business, no commercial policy). Every row links back. Log a new task/meeting/call from the form — it must appear on the records you assigned.
11. **Ana Dib** remains the HO3-only shop: Home → **Open Ana Dib HO3 shop**. Cov A **$321,000**. Eight markets, zero bindable. **Do not bind Ana.** No policy from those quotes.

### Run-it-yourself path (proves match + bind)

1. **Leads** → **Drop a dec packet** (use `fixtures/sample-melbourne-ho-dec.txt` or the stub button). Name + phone/email **matches Elena** — you stay on her lead, no duplicate.
2. Or **Stub email lead** / **Stub social lead** — new names create new leads; same name+phone/email matches.
3. On a new unmatched lead: **Start shop** → Deal (shopping) + empty Quote Sheet. Upload a source dec. **Fill Quote Sheet blanks** (yellow/blue only).
4. **Quotes** → build stub quotes for green markets (filter-first; do not change appetite). **Finalize quote results** writes the cheapest-first note. Attach quote PDFs in the issued-quote slot.
5. **Bind (creates contact + policy)** — copies name, phone, email, mailing address from the lead/risk. One HO3 Policy, status Bound/Active. Contact shows Client + counts.
6. Commercial: on the deal, bind as **Business** to create an Account instead of a personal Contact. Same person can still be linked via **Businesses**.

## Do not

- Multi-tenant isolation, SaaS billing, vaults, real OAuth, native iOS
- Zoho live sync, rater APIs, fake AI scores
- Delete data
- Change appetite matching or the Ana fixture
- Create a Policy from a quote
- Fork a second CRM / files table / tasks table
- Build a softphone, dialer, or live Google Calendar sync
