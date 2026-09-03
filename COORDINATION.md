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

## Desk wiring (`cursor/desk-wiring-edcb`) — what this pass joined

Owner: wiring agent. Additive only. Did not rewrite phone/calendar files.

The parallel slices were a pile of pages. This pass makes one click-path:

| Slice | How it is wired |
| --- | --- |
| TEST-DESK lifecycle | Kept as CRM spine. Lead convert still keeps `leads.converted_deal_id` + `deals.lead_id`. Source docs stay on the Deal. |
| Quote Sheet | `quote_sheets` is the only shopping worksheet. Super-Copy JSON, Send to Fill, and Forms Fill all read `quote_sheets.values` for that Deal+line. Never raw PDFs. Yellow = missing. Blue = CHECK. |
| Chrome Fill | `GET /api/deals/:id/quote-sheets/:line/fill` builds `fitfirst.sheet` from the same row. Desk **Send to Fill** writes that JSON to `localStorage` + `postMessage`. `/fill-demo` reads it. Extension folder left as the add-on; no portal macros. |
| Forms stub | `/forms` + `/forms/fl-ho3?dealId=` call `fillFormFromSheet` against `quote_sheets.values`. |
| Account 360 | `/contacts/[id]` and `/accounts/[id]` (also `/businesses/[id]` alias). Lifetime + active/bound/pending counts come from `policies` rows, including newly bound ones. Activity timeline is the existing `activities` + `activity_logs` hook — softphone agent may still be finishing; do not rewrite `/calendar` or phone files. |
| Commercial Business | Same `accounts` table (no second businesses table). EIN/FEIN, employees, sales, W-2/1099. Harbor Key Marine LLC is the commercial Closed Won demo. Ruiz Tile stays Elena’s linked personal+business pair with zero commercial policies. |
| Multi-pipeline | Real links: `/pipeline?pipeline=p-c\|health\|life\|won-lost\|flood`. Flood is the admin-added board. Closed Won / Bind writes Policy. ARCHIVE later does **not** cancel `email_send_jobs` hung on `won_date`. |
| Email templates | Seeded thank-you + Google review. Bind calls `scheduleWonClientEmails`. `archiveCancelsEmailJobs()` is `false`. |
| Smart Search | `/search?q=` and `GET /api/search` find Lead, Deal, Contact, Business, Policy by name. |
| Dedup | Second bind of the same person reuses Contact (name + email/phone). Business matches EIN then exact legal name. Same person can hold a personal Contact and a linked Business. |

### Exact wired click path (FF-WIRE-1)

1. Lead Elena Ruiz → Deal Ruiz · Melbourne HO3 (Lead kept). Source docs on the Deal.
2. Quote Sheet on that Deal. Super-Copy / Send to Fill / Forms Fill = same sheet record.
3. Closed Won already created Contact Elena + Policy HO3-ELENA-2026. Quotes on the deal are not policies. **Ana stays Quote Sent / unbound**, Cov A **$321,000**.
4. Harbor Key Marine Closed Won created Business (EIN 59-1234567, 14 employees, W-2/1099) + Policy GL-HARBOR-2026.
5. Account 360 on Elena and Harbor Key shows lifetime + active counts, the new Policy, and the activity timeline (tasks assigned to Contact and/or Policy appear on both).
6. Pipeline switcher links are real. ARCHIVE does not cancel won-date emails.
7. Smart Search “Elena” / “Harbor” / “HO3-ELENA” finds the records.
8. Bind again does not duplicate Elena or Harbor Key.

## Overnight QA (`cursor/overnight-qa-desk-4c29`)

Owner: overnight QA. Additive only. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Did not rewrite filter-first matching (one appointed check already in `match.ts`). No emails, no rater APIs, no live Zoho writes, no fake AI scores. Ana was not bound. Rosa Keene was not merged.

Boot: `npm run db:migrate && npm run db:seed`, Postgres `fitfirst` / `fitfirst_dev`, app at port **43147**.

### Verified (broker click-path)

1. **Home** is owner desk (paper `#f7f3ec` + terracotta `#b4532a`). Copy says quotes including Ana’s $321,000 HO3 are pipeline, not written premium. KPIs click through: `/policies?status=in_force`, `/policies?written=this_month`, `/deals?stage=open`, renewals `/policies?renewal=30|60`, Work queue `/work-queue` ( `/queue` redirects here).
2. **Elena Ruiz** Lead (converted) → Deal **Ruiz · Melbourne HO3** (bound) → Quote Sheet (Super-Copy / Send to Fill / Forms Fill) → Contact Elena **Client, lifetime 1 / in-force 1** → Policy **HO3-ELENA-2026**. Timeline on Contact and Policy shows the 30-day task, meeting, bind-confirmation call, and bind log. Linked business **Ruiz Tile LLC**.
3. **Ana Dib** stays **shopping / unbound**. Cov A **$321,000** (`source: javy`, confirmed). Contact 360: **0 / 0 policies**, not a client. Markets: **0 green / 0 yellow / 10 skip (red)**. Sheet health **18 confirmed / 0 CHECK / 15 missing** (33 catalog fields) — not 100%. Fill packet `GET /api/deals/<ana>/quote-sheets/home/fill` is `kind: fitfirst.sheet`, `source: quote_sheets`, `coverage_a: 321000`. Fixture JSON untouched.
4. Quote Sheet → **Send to Fill** + **Forms Fill** share the same `quote_sheets` row. `/forms/fl-ho3?dealId=<elena>` fills Elena / Cov A 385000. `/forms/fl-ho3?dealId=<ana>` fills Ana / Cov A 321000.
5. **Harbor Key Marine LLC** Business: EIN 59-1234567, 14 employees, W-2/1099, Policy **GL-HARBOR-2026** on the Business (lifetime 1 / in-force 1). **Ruiz Tile LLC** linked to Elena, **0 commercial policies**, not a client. COI section present; **no stub issued**.
6. **Activities**: Task / Call / Meeting log form on Contact and Policy 360. Seeded Elena rows appear on both. **Phone** is a stub page (`/phone`) — no softphone dock in layout.
7. **Search** (wave-1 is in): Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction all hit.
8. **New slices that load**
   - Markets auto-shops **Ortega · Winter Garden HO3**: 8 green / 1 yellow / 1 red.
   - Merge review: open **Rosa Keene** email pair (`Rosa.Keene@` / `rosa.keene@`). Ana is locked out of the queue. Not merged.
   - Work queue: owner attention + bound/pending/lapse list.
   - Claims log page (empty).
   - Commissions pending/paid page ($0 / $0).
   - Vehicles section on Auto **QBE-PA-66103** (empty schedule).
   - Locations on 360: **Rosa Keene** shows Harbor Lane dwelling; Elena/Harbor empty.
   - Renewal compare `/policies/<id>/compare` (no terms seeded).
   - Quote tracker `/quotes`: Ana 1 quoted / 3 declined / 6 skip / 0 bound; cheapest quoted American Integrity $5,607.53 not bindable.

### Open bugs (fixer titles)

**QA-2 Harbor Key identity split.** Search “Harbor” returns desk **Harbor Key Marine LLC** (EIN 59-1234567, `GL-HARBOR-2026`) **and** owner-book **Harbor Key Holdings** contact + deal `Harbor Key Holdings · marina GL` + policy `TR-GL-22019`. Two entities. Do not collapse Marine LLC. Decide keeper / rename / link.

**QA-3 COI stub not seeded on Harbor Key Marine.** Account 360 empty-states Certificates. Preview route `/businesses/[id]/certificates/[certId]` is not wired to desk schema (`getIssuedCertificate` missing; `AppShell` has no `eyebrow`). Seed a stub **or** remove the preview until the slice compiles.

**QA-4 Commissions seed not wired.** `/commissions` Pending $0 / Paid $0. `src/lib/db/seed-book.ts` / commission rows are not called from `seed.ts`. Pages empty-state; do not invent amounts.

**QA-5 Claims log seed not wired.** `/claims` empty. `seed-claims.ts` not called. Do not invent a claim.

**QA-6 Auto vehicles seed not wired.** Auto policy `QBE-PA-66103` (Camila Ruiz) shows “No vehicles on this policy yet.” `seed-auto.ts` not called.

**QA-7 Renewal compare has no terms.** `/policies/<id>/compare` reads `policy_terms` / `renewal_compare_logs` — both empty. `seed-book-renewals.ts` not called. Original `ComparePanel` + `actions/renewal.ts` still import missing `PolicyCoverageLine`; do not reattach until that compiles.

**QA-8 Elena 360 has no location row.** Mailing 412 Harbor Isle Dr is on the contact. `locations` only exist on the Rosa Keene pair. Add a premises row for Elena (and Harbor Key job site) if 360 should show them.

**QA-9 Two Ruiz Melbourne HO3 deals.** Lifecycle **Elena** `Ruiz · Melbourne HO3` (bound, HO3-ELENA-2026) vs completeness/owner-book **Camila** `Ruiz · Melbourne HO3 (bound)`. Easy to open the wrong shop. Do not retitle Ana.

**QA-10 Reyes · Cocoa HO3 is bound with no Policy.** Owner-home attention is correct: deal stage bound, `contact_id` set, zero policy rows. Seed should either attach a policy or leave the deal shopping.

**QA-11 Slice action modules do not compile against the desk schema.** `src/app/actions/{activities,claims,commissions,locations,renewal,auto-schedule}.ts` and `src/lib/db/activity-queries.ts` still import `businesses`, `activityAttendees`, `activityEvents`, `@/lib/auth/session`, `PolicyCoverageLine`. Visiting the old `/calendar` 500’d and poisoned Turbopack for every route. Calendar/phone are stubs now. Do not import those actions from desk pages until aligned.

**QA-12 Forms catalog always deep-links Elena.** `/forms` “Fill from Elena Quote Sheet” hardcodes `ELENA_DEAL_ID`. Deal-level Forms Fill passes the current `dealId` (correct). Pass the open deal (or last sheet) from the catalog.

**QA-13 No live phone.** `/phone` and Settings “Connect phone line” are stubs. Softphone JS exists but is not mounted. Task/Call on 360 is the working path.

### Fixed on this run (do not re-file)

- Home “Work queue” pointed at `/queue` while nav used `/work-queue` — one queue now; `/queue` redirects.
- 360 was missing locations / Auto vehicles / COI empty-states / renewal compare link — thin read panels added.
- `boundWaitingOnIssue` ignored commercial policies on `deal_id` / account, so **Harbor Key Marine · GL** (active `GL-HARBOR-2026`) falsely showed “bound, waiting on issue.”
- Missing `ACTIVITY_STATUS_ALIASES` export + broken calendar compile that 500’d the whole desk.

### Ana lock (re-checked after seed + click)

Deal `Dib · Palm Bay HO3` = **shopping**. Contact policies = **0**. Cov A = **$321,000** javy/confirmed. Fixture file not edited.

## Do not

- Multi-tenant isolation, SaaS billing, vaults, real OAuth, native iOS
- Zoho live sync, rater APIs, fake AI scores
- Delete data
- Change appetite matching or the Ana fixture
- Create a Policy from a quote
- Fork a second CRM / files table / tasks table
- Build a softphone, dialer, or live Google Calendar sync
