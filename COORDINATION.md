# FitFirst coordination — TEST-DESK

This file is the handshake for additive desk work. Do not invent a second CRM shape. Every module talks: Lead → Deal → Contact/Business → Policy.

Runtime stays single-tenant (`TENANT_ID`). New tables carry `tenant_id`. Checked-in SQL is under `drizzle/`. Restyle through `--ff-*` tokens only.

## Locked lifecycle (do not invent a different funnel)

1. A lead arrives (manual or email/social stub). Create or match a Lead (name + phone or email when present; **never duplicate**). The Lead is the person: first / middle / last, DOB, email, phone, address, insurance type desired, source, language, notes.
2. Convert that Lead into a Deal. The Deal is the shopping record. Source docs (dec, 4-point, wind mit, inspections) are dropped **on the Deal only** — not on Leads. Fill Quote Sheet blanks from those docs (yellow missing / blue CHECK). **Do not create a Policy from a quote.**
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
| Agency operating tools (`cursor/agency-operating-tools-e272`) | Owns `/calendar`, `/tasks`, Google Calendar stub. Consume `activities` `{ kind: task\|meeting\|call, contact_id, deal_id, policy_id }`. TEST-DESK adds `account_id` + `activity_logs` (required). Calendar is now a real month/week/day board (same `activities` table). `/phone` is a call log, not a softphone. Telephony connect is an Admin stub. |

## Calendar + phone + carrier + settings (`cursor/calendar-phone-carriers-0cc7`)

- `/calendar` — month / week / day, hourly slots 7a–7p, type filters, edit dialog, drag-drop reschedule. Writes `activities` + `activity_logs`.
- `/phone` — call log with related-record FKs. `/settings/phone` Admin stub for Twilio / Vonage / BYO. No purchase, no keys stored.
- Carrier record expands Zoho-like fields (NAIC, AM Best, UW/AM, claims/billing, NB/renewal %, appetite / don't-write). **Ask a teammate** stays Admin-only on Carrier.
- Settings hub is two columns: Admin vs Agent, collapsible sections.

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

1. **Deals** → **Drop a dec / wind mit / 4-point** (use `fixtures/sample-melbourne-ho-dec.txt` or the Melbourne sample button). Name + phone/email **matches Elena** — you stay on her deal, no duplicate. Leads do not accept package drop.
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
| Multi-pipeline | Real links: `/pipeline?pipeline=p-c\|health\|life\|flood\|won-lost\|archive`. Label is **P&C pipeline**. Won-Lost and Archive are separate tabs. Flood is a normal board (no Admin). Closed Won / Bind writes Policy. ARCHIVE later does **not** cancel `email_send_jobs` hung on `won_date`. |
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

### QA fix pass (`cursor/qa-fix-desk-19d2`)

One fixer. Additive only. Did not edit the Ana fixture. Did not rewrite filter-first matching. Did not invent commissions, claims, premiums, or vehicles — wired existing `seed-*.ts` files into `seed.ts` and aligned leftover action modules to the desk schema (`accounts` + `activity_logs`). Harbor Key Marine LLC (EIN 59-1234567 / `GL-HARBOR-2026`) was not collapsed. QA-13 phone stub stays a stub.

**Harbor Key identity (QA-2 decision):** keep desk **Harbor Key Marine LLC**. Rename the owner-book contact/deal from “Harbor Key Holdings” to **Keystone Holdings** (`Keystone Holdings · marina GL (owner-book)`, policy `TR-GL-22019` unchanged). Notes on that pair do not contain the word Harbor, so Search “Harbor” keeps Marine LLC / Marco Alvarez / GL-HARBOR-2026 and does not surface Keystone. Producer-pay book rows from `seed-book.ts` use contact **Book Marina** (not Marine LLC). Do not merge them.

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

### Re-QA (`cursor/overnight-re-qa-531d`) after fixer `cursor/qa-fix-desk-19d2`

Owner: re-QA. Additive only. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Did not rewrite filter-first matching. Did not bind Ana. Did not merge Rosa Keene. No emails, no rater APIs, no Zoho writes. Did not build a live phone.

Boot: `npm run db:migrate && npm run db:seed` succeeded on Postgres `fitfirst` / `fitfirst_dev`. App at port **43147**. Pages on the feel-pass returned 200 (aliases `/queue` and `/businesses/:id` 307 as designed). No 500s.

**Pass / fail per fixer title (clicked + SQL + fill/search APIs)**

| Title | Result | What I saw |
| --- | --- | --- |
| QA-2 Keystone Holdings rename | **PASS** | Owner-book deal is `Keystone Holdings · marina GL (owner-book)`, policy `TR-GL-22019`. Search `Harbor` returns Harbor Key Marine LLC / `GL-HARBOR-2026` / Marco Alvarez — **not** Keystone or “Harbor Key Holdings”. (Rosa Keene / Elena / Nia Patel also hit because their streets contain Harbor.) |
| QA-3 Harbor COI stub | **PASS** | Business 360 lists `COI-20260820-0001` issued to Palm Bay Marina Dockage. Preview route renders the stub. Harbor Key Marine is **not** “waiting on issue.” |
| QA-4 seed-book commissions | **PASS** | `/commissions` Pending **$1,132.28** / Paid **$804.50** (11 seeded rows). Not $0/$0. |
| QA-5 seed-claims | **PASS** | Claims log shows Ruiz water `AI-CLM-19044` on `AI-HO-66102`. |
| QA-6 seed-auto | **PASS** | Soto `FF-PA-4401` policy page lists 2 vehicles (CR-V + Camry). 2 drivers are in the seed. Ana stays 0 policies. |
| QA-7 seed renewals | **PASS** | Hale `HP-FL-88421` compare has current $2,184 / 2% vs proposed $2,547 / 5%. Nair `PA-FL-22910` has $1,428 vs $1,356. Thin reader only. |
| QA-8 Elena + Harbor locations | **PASS** | Elena 360: Harbor Isle Dr. Harbor Key Marine: Harbor Key Blvd shop. Rosa Keene Harbor Lane stays. |
| QA-9 Camila deal retitle | **PASS** | Elena deal stays `Ruiz · Melbourne HO3`. Camila is `Camila Ruiz · Melbourne HO3 (bound)`. Ana not retitled. |
| QA-10 Reyes pending | **PASS** | `REYES-HO3-PENDING` status pending on Reyes · Cocoa HO3. Work queue lists the issue packet. |
| QA-11 actions compile | **PASS** | Desk pages load. Task / Meeting / Call form is on Elena Contact and Policy 360. Calendar/phone stay stubs. |
| QA-12 forms catalog | **PASS** | `/forms` catalog links `?dealId=` (last `quote_sheets` row, not a hardcoded Elena id). `/forms/fl-ho3?dealId=<ana>` fills Ana / Cov A **321000**. Elena dealId fills Elena / 385000. Same `quote_sheets` row as Send to Fill. |
| QA-13 phone stub | **leftover (accepted)** | `/phone` is still a stub. Do not build a live softphone. |

**Feel-pass also confirmed:** Home is owner desk (paper `#f7f3ec` + terracotta `#b4532a`). Copy says Ana’s $321,000 HO3 is pipeline, not written. KPI links: `/policies?status=in_force`, `written=this_month`, `/deals?stage=open`, renewals 30/60, Work queue `/work-queue`. Ana markets **0 green / 0 yellow / 10 red (skip)**. Sheet health **18 confirmed / 0 CHECK / 15 missing** (not 100%). Ortega auto-shops **8 green / 1 yellow / 1 red**. Rosa Keene email pair still **open**. Quotes board: Ana 1 quoted / 3 declined / 6 skip / **0 bound**; cheapest American Integrity $5,607.53 not bindable. Search hits Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Observed, **not filed** (pre-existing / accepted, not a fixer miss): Search is substring, so `Ana` also lists the Camila deal (`Camila` contains `ana`). Soto’s 2 drivers are seeded; the thin policy page only lists vehicles (same leftover pattern as ComparePanel not reattached). Do not invent Camila vehicles.

### Errors / smoke (`cursor/errors-smoke-qa-74df`) after re-QA `cursor/overnight-re-qa-531d`

Owner: errors-smoke. Additive only. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Did not bind Ana. Did not write Zoho. Did not merge Rosa Keene.

Boot: `npm run db:migrate && npm run db:seed` on Postgres `fitfirst` / `fitfirst_dev`. App at **43147**.

**Patched on this branch:** invalid record ids (`not-a-uuid`) 500'd Contact / Business / Policy / Deal / Lead / Claim / Merge / Forms `dealId` / Quote tracker `?deal=` / Fill API / COI preview. Postgres `22P02 invalid input syntax for type uuid`. Loaders now `isUuid()`-guard and 404 / empty instead of throwing. Empty deal filters show a sentence instead of a header-only table.

**Smoke (HTTP + SQL). Ana locked. No Zoho writes.**

| Path | Status | Notes |
| --- | --- | --- |
| Home / owner desk | 200 | In-force **56** (55 active + 1 bound). Written $118,726.67. Copy: Ana $321,000 HO3 is pipeline, not written. Cookie `ff_role=agent` → “Your book” 200. |
| Elena 360 `/contacts/4444…444` | 200 | **Client**, lifetime 1 / in-force 1, `HO3-ELENA-2026` $2,840, Ruiz Tile LLC. No total-premium / total-commission rollup. |
| Ana 360 `/contacts/2222…224` | 200 | **Not a client**, 0 / 0 policies. Quotes did not become coverage. |
| Harbor `/accounts/6666…665` | **200** | First load OK. EIN 59-1234567, `GL-HARBOR-2026` $4,180, COI stub. Alias `/businesses/:id` 307. |
| Policy `HO3-ELENA-2026` | 200 | Premium $2,840 renders. No commission fields on the policy page (no throw). |
| Ana Quote Sheet / Markets | 200 | Cov A **$321,000** visible. Markets **0 green / 0 yellow / 10 red**. No invented policy numbers. |
| Carriers list `/carriers` | 200 | Appetite table. `/carriers/:id` **404** — no detail route. Decline area is `/logs` 200. |
| Calendar `/calendar` | 200 | Stub pointing at Tasks. |
| Settings `/settings` | 200 | Phone-line stub only. No Agency vs My desk tabs (scope lives on Home via cookie). |
| Forms `/forms` + `/forms/fl-ho3?dealId=Ana` | 200 | Ana Cov A 321000. Bad `dealId` 200 “no deal”. Missing slug 404. |
| Missing UUID | 404 | Graceful “Record not found”. Empty list filters 200. |

### Ranked leftovers (not patched)

**Major**
- **No carrier detail.** `GET /carriers/<id>` 404. List has no row links. Decline log is `/logs`.
- **Policy commission fields absent.** `/policies/4444…445` shows premium only. `/commissions` 200 ($1,132.28 pending / $804.50 paid) is the working surface.
- **360 has no premium/commission totals.** Related policies list per-row premium; no sum on Elena or Ana click-in.
- **Settings has no Agency vs My desk.** `/settings` is the phone stub. Owner/agent switch is Home cookie `ff_role` / `ff_actor`.

**Minor**
- Search substring still lists Camila when querying `Ana` (accepted leftover).
- `/phone` stub (QA-13 accepted). Do not build a softphone.
- Custom 404 copy is in the RSC payload; Next still wraps `NEXT_HTTP_ERROR_FALLBACK;404`.

### Open bugs (leftovers only)

**QA-13 No live phone.** `/phone` is a stub. Softphone JS is not mounted. Task/Call on 360 is the working path. Accepted — do not build a live softphone.

Camila Auto `QBE-PA-66103` still has an empty vehicle schedule. The intended Auto seed is Soto `FF-PA-4401` (2 vehicles on the policy page; 2 drivers seeded). Do not invent Camila vehicles.

### Fixed on this run (do not re-file)

- Home “Work queue” pointed at `/queue` while nav used `/work-queue` — one queue now; `/queue` redirects.
- 360 was missing locations / Auto vehicles / COI empty-states / renewal compare link — thin read panels added.
- `boundWaitingOnIssue` ignored commercial policies on `deal_id` / account, so **Harbor Key Marine · GL** (active `GL-HARBOR-2026`) falsely showed “bound, waiting on issue.”
- Missing `ACTIVITY_STATUS_ALIASES` export + broken calendar compile that 500’d the whole desk.
- **QA-11** Slice actions / `activity-queries` aligned to `accounts` + `activity_logs` (no `businesses` / attendees / events / `@/lib/auth/session`). Finish-call uses `activities-desk`. Calendar/phone stay stubs. `PolicyCoverageLine` is on the schema. Desk pages no longer 500 from leftover modules.
- **QA-3** Harbor Key Marine LLC has a seeded COI stub (`COI-20260820-0001`, Palm Bay Marina Dockage). Preview route uses `getIssuedCertificate` + `AppShell` eyebrow.
- **QA-4** `seedUsersAndBook()` wired. `/commissions` reads those rows (amounts from `seed-book.ts` only).
- **QA-5** `seedClaimsBook()` wired. Ruiz water claim `AI-CLM-19044` on `AI-HO-66102`.
- **QA-6** `seedAutoBook()` wired. Soto `FF-PA-4401` is 2/2. Ana stays 0/0.
- **QA-7** `seedBookRenewals()` wired. Hale `HP-FL-88421` and Nair `PA-FL-22910` have current + proposed terms. Compare page stays the thin reader (ComparePanel not reattached).
- **QA-8** Elena 360 has Harbor Isle premises. Harbor Key Marine has the Blvd job-site row. Rosa Keene Harbor Lane stays.
- **QA-9** Camila deal retitled `Camila Ruiz · Melbourne HO3 (bound)`. Elena `Ruiz · Melbourne HO3` unchanged. Ana not retitled.
- **QA-10** Reyes · Cocoa HO3 now has pending policy `REYES-HO3-PENDING` on the bound deal (no invented premium).
- **QA-2** Owner-book Holdings renamed to Keystone Holdings so Search “Harbor” keeps Marine LLC as the commercial walk. See decision above.
- **QA-12** `/forms` catalog fills from `?dealId=` or the last updated `quote_sheets` row, not a hardcoded Elena id.

### Ana lock (re-checked after seed + click)

Deal `Dib · Palm Bay HO3` = **shopping**. Contact policies = **0**. Cov A = **$321,000** javy/confirmed. Fixture file not edited.

## Live desk walkthrough (this branch)

Additive on the fixer + overnight re-QA book. No live Zoho writes. Ana stays shopping / 0 policies / Cov A $321,000.

Shipped on `cursor/live-desk-walkthrough-531d`:

- Larger global type and left menu. Agency name + logo slot (Settings, Admin) — not hardcoded FitFirst in chrome.
- Admin (Javy) vs Agent (Maya) login. Unauthenticated still behaves as Admin so click-paths work.
- Home: compact mix + cross-sell from in-force policies only.
- Deals / Contacts / Businesses / Policies / Carriers / Tasks: column picker, richer defaults, Deals row comms.
- Policies list: Insured (not Party), P&C / Life / Health + Home/Auto/Flood/Commercial subfilter. Name click is the policy record (UUID 500 on empty `convertedDealId` fixed).
- Two-section collapsible records (this record + related on the same page) for Contact, Business, Lead, Deal, Policy, Carrier.
- **Communications timeline on the record:** every send/receive writes `activity_logs` (direction, thread, full body). Email inbound + outbound share a thread (`Re:`/`Fwd:` stripped). SMS sent/received on the same thread. Uses existing email template stubs. No Twilio/SendGrid, no second mailbox.
- Pipeline: create deal, Admin add/relabel/delete stages, columns + table view.
- Tasks CRUD. Calendar lists colored activities + quick-add. Google Calendar stays stub.
- Policy record: Effective + X-Date, Selling Agency (AFA / First Connect / Agentero / Agility / BackNine), Zoho commission math (Life 9/12+3/12, P&C TAC, Marketplace PMPM on the policy, MA TAC=GWP). **No Medicare new/renewal field.** Renewal tasks 30/60 on, 90 off. OEP stay-put is an internal task only.
- Client status remains computed: Client / Former client / Not a client (Ana).
- **Internal ask (not a chat product):** Admin tags a teammate on Contact / Lead / Deal / Business / Policy / Carrier. Reuses `record_asks` (same table as commission “ask about this”). Writes the durable `activity_logs` row and an in-app `alerts` ping (`record_ask`). No email/SMS to the tagged person. Seeded: Javy → Maya on Elena policy HO3-ELENA-2026.
- Record edits stay pre-filled from the record (and bind copies Cov A + premises from the deal risk). Contact/Lead/Business show address + DOB the desk already has. No blank retype forms.
- Enter-once copy: Lead mailing/city/state/ZIP/DOB → Deal risk + Quote Sheet on convert; bind copies those onto Contact/Business/Policy and fills only blank party fields. Policy/Contact/Business forms fall back to the linked Deal/Lead so the agent does not retype.

Seeded proof: Elena Contact/Policy show outbound + inbound “HO3 bind confirmation”. Harbor Business/Policy show outbound + inbound SMS about the COI. Alerts list the Elena status ask with Open record.

## Desk merge unblock (`cursor/desk-merge-unblock-f2e7`)

Mac-ready umbrella for localhost:43147. Starts from `cursor/desk-unblock-compile-eeac` and merges:

- `cursor/crm-core-routes-9f03`
- `cursor/ams-ops-routes-compile-2e23`
- `cursor/list-pages-jsx-43c4`
- `cursor/comms-nav-smoke-9493`

Conflicts favored compile + working Col-based list pages. Ana fixture untouched (unbound, Cov A $321,000). Quotes still do not create a policy. No live Zoho. Navy sidebar tokens (`--ff-sidebar` / `--ff-bg`) restored so the desk does not wash to a white rail. `getReviewTask` 404s on non-UUID ids.

Also merged `cursor/restore-brand-domain-exports-a266`. It only re-added `AGENCY_BRAND`, color/font/density presets, `LIST_COLUMN_CATALOG`, and brand fixture IDs — already present from desk-unblock/crm-core. Duplicate block stripped so `domain.ts` stays one file. Agency / My desk presets unchanged (`agency`, `terracotta`, `forest`, `slate`).

HTTP smoke on this branch (dev + seeded Postgres): every app-shell NAV route returned 200. Ana deal `Dib · Palm Bay HO3` stays **Shopping**, Cov A **$321,000**. `/quotes` is quote tracking (no `HO3-ELENA` policy number). `/tasks/foo` 404s. `/documents` still 500s (`Object.entries` on null) — not a NAV item.

`next build` Turbopack **compiles**; `tsc` still drifts (asks.updatedAt, contact tags, quote-sheet `photo-ocr` source, email template field names, commission extras).

Full desk QA (every NAV route + CRM + comms) should run next on this branch.

## Desk unblock (`cursor/desk-unblock-compile-eeac`)

Off `cursor/feel-pass-consolidate-5e5c`. Shared leftover that blocked Mac Chrome feel-pass:

- Restored `AGENCY_BRAND`, color/font/density presets, `LIST_COLUMN_CATALOG`, `defaultColumnLayout`, `resolveColumnKeys` (and template/document constants) on `@/lib/domain` from cb1393c + later slices.
- `policies/page.tsx` no longer has two tbody renderers. ColumnPicker is actions-only; `Col` matches thead.
- Leads / carriers list pages use the same picker. Brand fixture IDs restored. CRM/documents helpers that pages import compile again.

Companion comms+nav work should reuse these domain exports rather than inventing a second brand module. Ana fixture untouched. No live Zoho.

## Feel-pass consolidate (`cursor/feel-pass-consolidate-5e5c`)

One Mac Chrome feel branch. Starts from `cursor/live-desk-walkthrough-531d` (overnight re-QA + records). Merges QA + today’s pack walkthrough tips. Additive migrations only (`0008_comms_qa`, `0009_pack_addons`). Ana fixture untouched. No live Zoho writes.

## Communication QA (`cursor/comms-qa-9e37`)

Owner: comms QA. Additive only. Did not edit the Ana fixture. Did not write live Zoho.

- Ask a teammate (admin v1) on Policy / Contact / Lead / Deal / Business / Carrier. Tag dropdown required. Seeded Javy → Maya on `HO3-ELENA-2026` (`record_asks` + activity log + Alerts).
- Activity form logs duration + outcome on calls.
- Click-to-call is an in-app Alerts ping (`click_to_call`). `/phone` stays a stub.
- Settings shows email template library + trigger stubs. Nothing sends.
- Alerts list includes the Elena ask and a work-queue ping. In-app only.

## Errors smoke QA (`cursor/errors-smoke-qa-74df`)

Invalid record UUIDs return 404 instead of a Postgres 22P02 500. `isUuid` guards live in loaders.

## Pipeline overhaul (`cursor/pipeline-overhaul-d52a`)

Owner: this branch. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays unbound, Cov A **$321,000**. No live Zoho.

- Switcher tabs: **P&C pipeline**, Health, Life, Flood, **Won-Lost**, **Archive**. Flood has no Admin badge and no Admin stage panel.
- Columns sit side-by-side (horizontal scroll) and collapse from the header.
- Edit stages on any board: add / rename / remove / reorder. Not admin-gated.
- Drag deals between columns. Closed Won still has **Move to Archive**. Archive does not cancel won-date emails.
- **Columns** picker show/hides the same deal details on cards and the table view.

## Business record UX (`cursor/business-record-ux-132e`)

Owner: this slice. Additive only. Mirrors Contact UX from `cursor/contact-record-ux-5288` on **Business / Accounts** only.

- Left jump menu on `/accounts/[id]` (alias `/businesses/[id]`): Overview, Business information, Address, Policies, Deals, People, Locations, Certificates, Ask a teammate (Admin only), Email/SMS/calls, Timeline.
- Timeline is auto-saved desk work. No typed “log activity” form on Business.
- Ask a teammate is hidden for agents on Business. Other records keep the existing framed panel.
- Shared `RecordSection` / `LocationsList` / `CertificatesList` / `RecordAskPanel` / `RecordComms` stay backward compatible (`collapsible`, `framed`, `hideWhenNotAdmin` default to the old Contact/Policy behavior).
- Contact 360 is unchanged. Ana fixture untouched. Harbor Key Marine LLC stays **Client** (lifetime 1 / in-force 1, `GL-HARBOR-2026`, COI stub). Ruiz Tile stays Elena’s linked business with **0** commercial policies. No live Zoho.

## Life / Health subfilters + LOB toggles (`cursor/life-health-lob-agency-8c04`)

Owner: this slice. Additive only. Did not edit the Ana fixture. Did not bind Ana. No Zoho.

- Configurable Life chips: Term Life, Whole Life, IUL, Final Expense (`line_subfilter_options`).
- Configurable Health chips: Marketplace, Medicare Advantage, Medicare A&B, Supplemental.
- Settings → Lines: add/delete those options. Admin only.
- Settings toggles hide Life, Health, or both. Pipeline switcher and book filters on Policies / Deals follow the toggles. Hidden board URLs fall back to P-C. Sidebar keeps **one Pipeline row**.
- Selling Agency picklists are off by default. Settings can turn them back on for multi selling-agency desks. Stored `selling_agency` values are kept as hidden fields when the picklists are off.
- Additive schema: `agency_settings.write_life` / `write_health` / `show_selling_agency`, `deals.policy_sub_type`, table `line_subfilter_options`. Migration `0013_line_settings`.

## Overnight Mac-ready merge (`cursor/mac-ready-overnight-3bad`)

Starts from `cursor/full-desk-test-4d20`. Merges Batch 1 (Home donut, Pipeline overhaul, Leads cleanup, Columns + address autofill, Contact UX) and Batch 2 (Business UX, Life/Health LOB, Quotes/Claims/Commissions, Datasheet sort/pin, Calendar/Phone/Carriers/Settings). Conflicts favored compile + working UX.

- Ana fixture untouched: shopping / Quote Sent, unbound, Cov A **$321,000**. Quotes do not become policies. No live Zoho. Every new table has `tenant_id`.
- Additive migrations only: `0012_leads_profile`, `0013_line_settings`, `0014_calendar_phone_carriers`.
- One Pipeline sidebar row. Life/Health stay as `/pipeline` tabs. Seed always writes `pipeline_stages.pipeline_id`.
- Sidebar stays navy (`--ff-sidebar` / ink) — not washed to white.

HTTP smoke on this branch (dev + seeded Postgres, port 43147): every app-shell NAV route 200. Elena / Ana / Harbor records 200. Invalid UUIDs 404. Ana deal `Dib · Palm Bay HO3` stays **Quote Sent**, Cov A **$321,000**, 0 policies. `/quotes` is quote tracking (no `HO3-ELENA` policy number). `/carriers/:id` 200 (calendar slice). `/documents` still 500.

## Pipeline board UX + Meetings (`cursor/pipeline-meetings-11f3`)

Owner: BATCH3. Starts from `cursor/list-hydrate-fix-46dc`. Additive only. Did not edit the Ana fixture. Ana stays Quote Sent / unbound, Cov A **$321,000**. No live Zoho.

- Stage columns collapse from a small up/down arrow on the right of the header.
- Pipeline cards: one **Call** (no Dial), no Mail, plus **Meeting**.
- Meetings: Video-call / In-Home / In-Office. In-Office = agency + per-agent address. In-Home = Deal/Lead address. Video = Zoom / Meet / BYO stubs on Settings → Communications (`0015_meetings_comms`).
- Ask a teammate stays off pipeline cards. Admin-only on records.

## List sheet hydration (`cursor/list-hydrate-fix-46dc`)

Javy hit a Next.js overlay on Mac Chrome localhost:43147 after the datasheet sort/pin fold: server HTML had `data-sheet-index` on `<tr>` (stamped by `ff-sheet.js` before React committed) and the client tree omitted it. Overlay also suggested a `tbody` inside `thead` risk.

Fix:

- React renders `data-sheet-index` on both server and first client paint via `SheetTbody`.
- `ff-sheet.js` waits for `SheetBoot` (`data-ff-hydrated`) before sorting, pinning, or writing attributes. No more `load + 1ms` race.
- Sort/pin only touch `table > tbody` (`:scope > tbody`), never a body nested under `thead`.
- Ana stays unbound, Cov A **$321,000**. No Zoho.

Mac pull: fetch `cursor/pipeline-meetings-11f3`, `git reset --hard FETCH_HEAD`, `npm run db:migrate`, restart `npm run dev -- --port 43147`. Ana stays unbound / $321k.

## Quotes collapse + Claims add + Commissions filters (`cursor/quotes-claims-commissions-4af1`)

Additive desk slice. Did not edit the Ana fixture. Did not bind Ana. Did not write Zoho.

- **Quotes:** `/quotes` shops, deal Quotes tab (ranked / comparison / attempt log), and Quote Sheet groups use `DeskDetails`. Open when there is work (quoted/declined, missing/CHECK); fold skip-only or complete groups.
- **Claims:** `/claims` has a prominent **Add new claim**. `/claims/new` is the stub create flow. `logClaim` saves a `claims` row with or without a policy, then opens the claim.
- **Commissions:** `/commissions` filters Life / Health / P&C + Home/Auto/Flood/Commercial (or Life/Health subs) and date windows last year / 6 months / 3 months / month / quarter plus next month / 3 months / 6 months / quarter / year. Ana remains $0 / unbound.

## Do not

- Multi-tenant isolation, SaaS billing, vaults, real OAuth, native iOS
- Zoho live sync, rater APIs, fake AI scores
- Delete data
- Change appetite matching or the Ana fixture
- Create a Policy from a quote
- Fork a second CRM / files table / tasks table
- Build a softphone, dialer, or live Google Calendar sync
