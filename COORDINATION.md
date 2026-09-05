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
- Ask a teammate is hidden for agents on every record (Contact, Deal, Policy, Lead, Business, Carrier). The framed panel is Admin-only.
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

## Policies BATCH3 (`cursor/policies-batch3-eb71`)

Off `cursor/list-hydrate-fix-46dc`. Additive `0018_policy_global_lists` (renumbered from 0015 on merge). Ana fixture untouched. No live Zoho. Ana stays unbound.

- Policy record is by insurance family (Life / Health / P&C). Sub-type and term come from Settings → Global lists (Zoho-style). Cov A is quoting only — not on the policy form.
- P&C: annual premium, insured address with same-as mailing, effective date, policy #, auto name `{Insured} / {Sub-Type} / {Carrier} / {date}`. Status colors: Active green; Lapse/Bound yellow; else red.
- Multi-file attach with + add another and categories. Separate from Save policy.
- Commission section uses the existing Zoho Life 9/12+3/12 / P&C TAC / Marketplace PMPM rules.
- Policy timeline is auto logs only. Ask a teammate and typed SMS/call/email logs are gone from the policy page.
- Home Needs attention: Overdue / This week / This month / Next month.
- Calendar: Previous month / Next month, delete event, + Add any event type.
- Quotes fold labels are Expand / Collapse (not Minimize).
- Work queue adds due date, priority, and Zoho-like status.

## List sheet hydration (`cursor/list-hydrate-fix-46dc`)

Javy hit a Next.js overlay on Mac Chrome localhost:43147 after the datasheet sort/pin fold: server HTML had `data-sheet-index` on `<tr>` (stamped by `ff-sheet.js` before React committed) and the client tree omitted it. Overlay also suggested a `tbody` inside `thead` risk.

Fix:

- React renders `data-sheet-index` on both server and first client paint via `SheetTbody`.
- `ff-sheet.js` waits for `SheetBoot` (`data-ff-hydrated`) before sorting, pinning, or writing attributes. No more `load + 1ms` race.
- Sort/pin only touch `table > tbody` (`:scope > tbody`), never a body nested under `thead`.
- Ana stays unbound, Cov A **$321,000**. No Zoho.

Mac pull: fetch `cursor/pipeline-meetings-11f3`, `git reset --hard FETCH_HEAD`, `npm run db:migrate`, restart `npm run dev -- --port 43147`. Ana stays unbound / $321k.

## BATCH3 quoting + integrations (`cursor/batch3-quoting-handoff-cca5`)

Owner: this branch. Additive `0015_batch3_quoting`. Did not edit the Ana fixture. Did not bind Ana. Did not change `src/lib/appetite/match.ts`.

- Lead convert stays the shop start. After a Deal source-doc drop, pick line / policy form. HO3 fills the home master sheet and prepares Auto + GL + WC worksheets.
- Master sheet requires visual review + “are you sure?” before quoting unlocks. Chrome Fill / Copy sheet / Open Fill window stay locked until then. No per-agent bot.
- Quotes tab logs quoted / declined / maybe. `maybe` is filtered out of match priors.
- Master risk + Markets are Admin-only. Ask a teammate on Deal is `hideWhenNotAdmin`.
- Settings → Communications / Integrations: email (Gmail/Workspace, Outlook/365, Yahoo), campaigns (Mailchimp, Constant Contact, SendGrid), calendar, phone/SMS (Twilio, RingCentral, Lightspeed Voice, Bandwidth optional), Zoom/Meet, DocuSign + Dropbox Sign. Plug-only. Agency pays. No FitFirst Twilio subscribe.

ASAP click path: Ana deal → pick HO3 if needed → Quote Sheet → approve + confirm → Copy sheet / Open Fill window → Quotes tab log maybe. Cov A **$321,000**. Do not bind.

## Quotes collapse + Claims add + Commissions filters (`cursor/quotes-claims-commissions-4af1`)

Additive desk slice. Did not edit the Ana fixture. Did not bind Ana. Did not write Zoho.

- **Quotes:** `/quotes` shops, deal Quotes tab (ranked / comparison / attempt log), and Quote Sheet groups use `DeskDetails`. Open when there is work (quoted/declined, missing/CHECK); fold skip-only or complete groups.
- **Claims:** `/claims` has a prominent **Add new claim**. `/claims/new` is the stub create flow. `logClaim` saves a `claims` row with or without a policy, then opens the claim.
- **Commissions:** `/commissions` filters Life / Health / P&C + Home/Auto/Flood/Commercial (or Life/Health subs) and date windows last year / 6 months / 3 months / month / quarter plus next month / 3 months / 6 months / quarter / year. Ana remains $0 / unbound.

## Settings IA + Integrations catalog (`cursor/settings-ia-integrations-e4fb`)

Owner: this slice. Starts from `cursor/list-hydrate-fix-46dc`. Additive only. Did not edit the Ana fixture. Did not bind Ana. No Zoho in the catalog. No live OAuth.

- Settings left menu is nested: parent → children. Groups: Communications (email, SMS, phone, video), Integrations (catalog hub), Lines / Global lists, Brand / Agency, Admin vs Agent prefs.
- `/settings/integrations` is the connectable catalog. BYO — agency pays. Connect stub + **Not connected** / **Connected (stub)** badges.
- Catalog (no Zoho): Email Gmail / Outlook / Yahoo; Campaigns Mailchimp / Constant Contact / SendGrid; Calendar Google / Outlook; Phone/SMS Twilio / RingCentral / optional Lightspeed Voice; Video Zoom / Google Meet; E-sign DocuSign / Dropbox Sign.
- Settings shape for later: `integration_connections` (`0015_integration_connections`). Gmail/Outlook/Yahoo, Google Calendar, and Twilio also flip the existing send-account / calendar / phone / SMS stub rows when present.
- New hubs: `/settings/communications`, `/settings/email`, `/settings/video`, `/settings/lists`. Existing settings pages keep their forms and pick up the nested nav.

Ana stays unbound, Cov A **$321,000**. Do not add Zoho Mail / Zoho Sign to this catalog.

## PII field encryption (`cursor/pii-field-encryption-a70d`)

Side branch off `cursor/mac-ready-batch3-7pm`. Additive `0021_pii_vault`. Ana fixture untouched (unbound, Cov A **$321,000**). No live carriers.

- AES-256-GCM via `PII_ENCRYPTION_KEY` (64 hex chars). Local Mac: copy `.env.example` as-is, or keep the documented demo key. Changing the key makes ciphertext unreadable — re-seed.
- Encrypted at rest: contact SSN (`ssn_enc` / `ssn_iv` / `ssn_last4`), business EIN (`ein_enc` / `ein_iv` / `ein_last4` / `ein_lookup`), driver license (`license_number_enc` / `license_number_iv` / `license_number_last4`). Plaintext `ein` / `license_number` columns stay for additive migrate and are nulled after backfill.
- UI lists send last4 masks only. Reveal (Admin or owning Agent) decrypts once and writes `pii_reveal_logs` without the value.
- Seed: Elena fake SSN `000-00-4444` sealed; Harbor `59-1234567` and Ruiz Tile `59-7654321` sealed; Soto DL sealed. No plaintext SSN/DL/EIN left in Postgres after `db:seed`.

## Do not

- Multi-tenant isolation, SaaS billing, vaults, real OAuth, native iOS
- Zoho live sync, rater APIs, fake AI scores
- Delete data
- Change appetite matching or the Ana fixture
- Create a Policy from a quote
- Fork a second CRM / files table / tasks table
- Build a softphone, dialer, or live Google Calendar sync

## BATCH3 deals docs + tabs + e-sign (`cursor/deals-docs-tabs-esign-5c3d`)

Starts from `cursor/list-hydrate-fix-46dc`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). No Zoho.

- **Deals list upload:** one section. Multi-line rows (doc type + file, add another line, multi-file OK). Deal name required with lookup/autofill from existing Deals (person or business). Files attach to that Deal. Melbourne sample dec button removed.
- **Deal Documents:** Source documents, Issued quote PDFs, and **Signed app** (e-sign returns).
- **Ask a teammate** removed from the Deal. Admin-only on Contact / Policy / Carrier / Business / Lead.
- **Quote Sheet / Markets / Quotes:** no Ask, no manual email/SMS logs, no email-send on Quote Sheet.
- **Master risk** is not an agent Deal tab. Admin background appetite tool at `/settings/master-risk`.
- **E-sign stubs:** Settings → E-sign. DocuSign and Dropbox Sign BYO. No vendor keys. Signed apps still attach on the Deal.

Migration `0015_esign_settings`.

## BATCH4 home dashboard (`cursor/home-dashboard-widgets-89ab`)

Side branch. Additive only. Keeps `--ff-sidebar: #c5ddf4` and the blue/orange tokens. Does not copy an InsuredMine dark rail. Ana stays unbound at Cov A **$321,000**. One Pipeline nav row.

- Agent home is own-book KPIs. Admin toggle: **My book** vs **Agency-wide**.
- Dense InsuredMine-like cards: active accounts, in-force premium, policies, ratios, new business / renewals / cancellations with MoM, carrier count, pipeline strip.
- Charts keep the policy-type donut and add carrier share bars.
- Top 10 leaderboard (this month + last month) and a seeded Q3 premium contest board. Admin can post another.
- Birthdays (today / next week / next month) and Turning 65 (next month / next year) from Contact DOB.
- Dashboard presets: My production / Pipeline focus / Retention. Widget settings show/hide cards. Settings → Agency can pin company widgets on agent home.
- Migration `0021_home_dashboard`. Seed does not add people — only extra producer users, DOB updates on existing contacts, and one contest.
- Home charts use a punchy blue/orange/teal series (not washed navy/gray). Sidebar stays `#c5ddf4`.
- Management lead-offer board (`0022_lead_offers` + `0031_inbound_lead_offers`): Admin posts language/state referrals (French + Montana stay). Admin can also share an inbound email (from/subject/snippet/stub). Agent Take ownership creates or links a Lead, assigns the agent, posts an in-app alert, and marks Claimed by X. Seeded unassigned Renee Colbert inquiry — Maya can claim. No Ana/Elena/Rosa dupes. No new people.

## BATCH4 Automations hub (`cursor/automations-hub-4d87`)

Side branch off the Mac desk-test consolidate. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). Sidebar hex unchanged (`#c5ddf4` / `#102033`). No domain catalog dupes.

- **Nav:** one **Automations** row → `/automations`.
- **Email campaigns:** uses existing `email_campaigns` + Mailchimp / Constant Contact / SendGrid catalog stubs. Empty state until one is connected.
- **Bulk SMS:** `bulk_sms_drafts` stub. Empty until SMS / phone_sms is connected. Logs would send.
- **Work email templates:** reads the existing `email_templates` library. Admin still edits in Settings.
- **Guided builder:** `guided_automations` — Trigger (Deal stage change, Policy renewal window, Birthday, Closed Won) → Condition → Action (in-app notify, create Task, send template email). Seeded 3 examples. Prefer in-app notify.
- **Signatures:** additive columns on `email_signatures` (`owner_user_id`, `approval_status`, review fields). Agents draft; Admin queue stub. Maya’s producer close seeds as pending.

Migration `0025_automations_hub`. Do not bind Ana.

## BATCH4 social + GBP connectors (`cursor/mac-ready-batch4-social-d88f`)

Side branch off `cursor/mac-ready-batch3-7pm`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). Sidebar hex unchanged (`#c5ddf4`). No live OAuth. No vendor spend.

- Settings → Social / Integrations catalog: Facebook, Instagram, X, LinkedIn, Google Business Profile connect/disconnect stubs. BYO — agency pays.
- `/social` pulse + Home widget: demo followers / engagement / views after a connect stub. Seed connects FB, IG, GBP.
- Inbound inquiry → Lead via `findOrCreateLead` (Priya Shah Instagram is the existing stub path).
- GBP Admin gate: `agency_settings.allow_agents_monitor_gbp` (default false). Agents see a locked GBP card until Admin enables monitoring.

Migration `0026_social_gbp`.

### Javy add-on — Lead + notify + award

- `src/lib/leads/offers.ts` is the contract for the home bulletin (home bot owns the board UI).
- Social inbound on an **agent-owned** stub: `ingestSocialLead` creates/matches a Lead, sets `owner_id`, writes a targeted `alerts.user_id` ping.
- Agency / unassigned inbound: Lead with null owner + `lead_offers.status=open`. Admin **Awards** to any agent (`awardLeadToAgent`) — assigns + notifies.
- Settings → Social: Admin sets each stub to Agency or an agent. Seed: Instagram → Maya; FB/GBP → agency.
- GBP monitor gate unchanged. Social inbound table is `social_lead_offers` (not management `lead_offers`). Migration `0026_social_gbp`.

## BATCH4 Admin calendar company meetings (`cursor/admin-company-meetings-0864`)

Side branch off `cursor/mac-ready-batch3-7pm`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). Sidebar hex unchanged (`--ff-sidebar: #c5ddf4`). Personal Video / In-Home / In-Office meetings stay.

- Calendar event types **Company meeting** and **Training** (Admin-created). `kind` stays `meeting`; `meeting_type` is `company` or `training`.
- Fields: title, start/end, video URL (Zoom / Meet / other http(s)), notes.
- Invite pickers: Whole agency | Office | Territory | Management only. Uses the offices / territories tables already on this consolidator (`0023_offices_territories`).
- Invited agents get `calendar_invites` + an in-app alert (`alerts.user_id`) and the event on their calendar (`listCalendarActivities` includes invitees).
- Event detail **Open video**. Agents cannot create company events.
- Migration `0027_company_meetings`. Do not bind Ana.

## BATCH4 People / Agents (`cursor/admin-people-agents-8ef4`)

Full roster on Settings → People / Agents. Keep this — do not replace with recovery-only Agents.

- Create agent (username or email). Invite stub at `/login/invite`. They set the password, then enroll MFA.
- Freeze / Unfreeze / Remove (soft). Frozen **Luis Vega** (`luis@fitfirst.local`) cannot sign in.
- Notify writes an in-app desk note + Alerts ping.
- Privileges: can access modules, can see agency widgets, office / territory hooks.
- Password reset stub `/login/reset`. MFA recovery stub `/login/recover`. Force re-enroll.
- Seed: Javy enrolled TOTP; Maya enrolled email; **Nora Frost** pending invite + MFA.
- Migrations `0028_agent_admin` + `0029_mfa_recovery`. Ana unbound. One Pipeline. Alerts off the sidebar.

## BATCH4 MFA + recovery (`cursor/mfa-recovery-batch4-a61a`)

Parallel auth-security track. Keep **with** People / Agents — enroll, challenge, and hashed recovery tokens.

- Password required on login. Hashed on `users.password_hash`; demo javy/maya still match.
- 2FA enroll: SMS stub, email stub, or TOTP at `/enroll-mfa` and Settings → Security. Desk gated until `mfa_enrolled`.
- Seed Javy (TOTP) + Maya (email) already enrolled with `mfa_demo_bypass`. `FF_MFA_DEMO_BYPASS=1` (default) skips the 2FA prompt so 7pm desk-test opens. Set `0` to type TOTP (`JBSWY3DPEHPK3PXP`).
- Admin recovery: `/recover/password` and `/recover/mfa` stub links (hashed in `auth_recovery_tokens`) plus People `/login/*` stubs. Nothing emails.
- UI: Settings → Profile, Settings → Security, Settings → People / Agents (roster + recovery).
- Additive migration `0032_auth_mfa_recovery` (incoming `0021` renumbered). Alters `mfa_challenges` from `0029`; does not drop it. Ana fixture untouched. One Pipeline nav row. Sidebar hex unchanged.

## BATCH4 carrier portal credentials (`cursor/carrier-portal-creds-06cb`)

Admin-only encrypted quoting-portal username + password on the carrier record. Agency code and portal URL stay on the sheet for Agents.

- AES-256-GCM via `CARRIER_SECRETS_KEY` (falls back to `PII_ENCRYPTION_KEY`, then the local demo key). Ciphertext + IV on `carriers`; never plaintext columns.
- Reveal writes `carrier_secret_reveal_logs` (no decrypted value stored). Admin only — Agents get `hasPortalUsername/Password=false` and no username hint.
- Seed: American Traditions `FF-AT-1048` and People's Trust `FF-PT-2201`. Existing Tailrow / American Integrity get agency codes only.
- Incoming `0027_carrier_portal_secrets` renumbered to `0033_carrier_portal_secrets`. Ana fixture untouched. One Pipeline. Sidebar hex unchanged.

## WAVE2 — Deal quote PDF view / email / SMS / print (`cursor/deal-docs-pdf-view-ba1b`)

Merged onto `cursor/mac-ready-batch4-7pm`. Deal Issued quote PDFs open in-browser (`/files/[id]` + `/api/files/[id]`), download, and Email / SMS / Print stubs. Elena seeds two real quote PDFs. Ana unbound (Cov A **$321,000**). No new migration. One Pipeline. Alerts off the sidebar.

## DOC → master sheet fill (`cursor/doc-master-sheet-fill-1202`)

Starts from `cursor/mac-ready-batch4-7pm`. Additive `0034_fill_feedback`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged.

**What was broken:** Deal Documents upload extracted fields onto `extracted_fields` / risk but never wrote `quote_sheets`. “Fill master sheet” (`setQuotingLine`) and “Fill blanks from source docs” only copied leftover extract rows through the thin lifecycle mapper — they did not re-parse dec / wind mit / 4-point. SheetDrop “Upload and fill” also skipped the Quote Sheet writer. Wind mit / 4-point could be skipped when `inferShopLine` saw “flood”. Inspection keys (`four_point_date`, `wind_mit_form`) lacked catalog extractKeys.

**Fix:** Upload / pick line / Fill master sheet all call `runFillDealSheets` (parse source docs → blanks-only Quote Sheet). HO source docs stay on the home line. Deal Documents is a 5-step flow with progress, errors, source-vs-sheet review, visual approve, then Send to Fill. Super-Copy still reads the filled sheet.

**Fill Feedback log** (`fill_feedback_logs`, `/quotes/fill-feedback`): when an agent/Admin corrects a mapped field after ingest, or marks a paste field wrong, store doc type / field / wrong / corrected / optional carrier. Later fill prefers that correction when the same extract repeats. Rule/log based — not ML. Seeded two Elena demo rows (roof covering; hurricane deductible).

## BATCH4 Fill Learning (`cursor/fill-learning-log-efeb`)

Merged onto `cursor/mac-ready-batch4-7pm` in WAVE-2. Additive `0035_fill_learning_logs` (incoming `0021` renumbered). Ana fixture untouched (unbound, Cov A **$321,000**). Does not change `src/lib/appetite/match.ts`. One Pipeline. Sidebar hex unchanged.

Appetite-logs-style memory for Quote Sheet / master-sheet field mapping from dec / wind mit / 4-point / other source docs.

- Table `fill_learning_logs`: date, deal_id, doc_type, field_key, extracted_value, corrected_value, corrected_by, note, optional carrier_id (paste failed).
- Master sheet UI: **Mark mapping wrong** → save correction writes the log and updates the sheet cell. Ana Coverage A is locked.
- Ingest hook: `runFillDealSheets` remaps extracted values via `applyLearningToExtracted` after Fill Feedback (`applyLoggedCorrections`). Extracted string must match — that is the agency-wide safety check.
- Admin browse `/logs/fill-learning` (tab next to Appetite / decline log). Agents can still mark a mapping wrong on the sheet.
- Seeded Elena HO corrections: wind mit roof year 2014→2019, dec CBS→masonry, 4-point comp shingle→architectural shingle. No Ana rows.

## DIFF A — Producer scorecards + lifecycle glance (`cursor/producer-scorecards-glance-4f97`)

Merged onto `cursor/mac-ready-batch4-7pm`. Additive only. No new migration (computed from existing Leads / Deals / Policies / Claims / tasks). Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged (`#c5ddf4`).

- **Scorecards** (`/scorecards`): Admin ranks every producer on conversion, retention, in-force premium, and binds. Sort tabs reuse those four metrics. Agents see **own** card + rank number — not other producers. Drill-in `/scorecards/[id]` is Admin-any / Agent-self.
- Conversion = binds / (binds + open shops + lost). Quote Sent is a shop. Bound / Closed Won is a bind. A quoted policy is not a bind and not premium.
- Retention = in-force / (in-force + lapsed). Premium is Active + Bound only.
- People / Agents **Open producer scorecard** points at the same math. Legacy `/settings/agents/[id]/performance` stub now renders the scorecard strip.
- **Glance** (`/glance?tab=`): unified Sales | Service | Claims | Renewals. URL tabs filter existing records (open deals, review tasks / endorsements / policy work, claims log, in-force renewals in 60 days). Agent-scoped. No second pipeline.

## DIFFERENTIATOR pack B — E&O audit + Compliance (`cursor/eo-audit-compliance-314d`)

Merged onto `cursor/mac-ready-batch4-7pm`. Additive `0036_eo_audit_logs`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged. Nothing emails Javy.

- Table `eo_audit_logs`: append-only (app insert + Postgres trigger). Who / when / what / record ids for email, SMS, call, meeting, doc view, reveal PII, policy change. No decrypted PII.
- Writers: `writeDeskComms`, `/api/files/[id]`, `revealPiiField`, `updatePolicyRecord`, `filePolicyChange`.
- Admin page `/compliance` (Settings + Logs tab). Live E&O flags: no client activity 90 days before renewal, Bound/Pending missing signed app, Quote Sent with no desk follow-up task.
- Seed writes a short Elena/Harbor trail and in-app `eo_gap` alerts to Javy only. Ana stays Quote Sent / unbound.

## DIFF D — Priority queue + campaign sequences (`cursor/priority-queue-campaigns-1a0d`)

Merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_campaign_sequences` renumbered to `0037_campaign_sequences`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged. Alerts stay in the header bell.

**Work queue.** `/work-queue` leads with a **Priority queue** sorted by renewal date (soonest first), then revenue at risk (premium desc). Columns: Due / Priority / Status / $ / Account. Eligible book: Active / Bound / Pending / Lapse. Quotes are not written premium — shopping-only Ana is not a row. Priority bands: lapse/overdue Highest; ≤30 days High (Highest if $≥2,500); ≤60 days Normal (High if $≥5,000). Needs attention + Bound/pending/lapse tables stay below.

**Campaign sequences.** `/automations/sequences` — five insurance catalogs: lead nurture, quote follow-up, 60/30 renewal, cross-sell, review ask. Each step is a desk Task stub or a work-email template stub (`seq-*` slugs in `email_templates`). On/Off only. Nothing sends. Seed + `ensureCampaignSequences()` keep the five rows. Review ask hangs on bind / Closed Won, not pipeline stage.

## DIFF L — Interactive quote compare + video proposal stub (`cursor/quote-compare-video-11d6`)

Merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_quote_compare_video` (`deals.video_proposal_url`) renumbered to `0038_quote_compare_video`. Ana fixture untouched (unbound, Cov A **$321,000**). No Loom API. No live Zoho. One Pipeline. Sidebar hex unchanged.

No branded proposal existed on the batch-4 base, so this slice ships a PDF proposal (agency letterhead + selected quotes + diffs + plain English). Stored on the Deal as `documents.slot = proposal` / `docType = proposal_pdf`.

- Interactive page `/deals/[id]/compare`: select quotes (and priced attempt-log rows), highlight field diffs, write a plain-English note.
- Quotes tab + `/quotes` board link into Compare. Documents lists branded proposals separately from issued quote PDFs.
- Video proposal is paste-only: **Record / upload link** saved on `deals.video_proposal_url`. Host it yourself (Drive, Vimeo, YouTube). FitFirst does not record and does not call Loom.
- Elena seed: `https://fitfirst.example/video/ruiz-melbourne-ho3`. Ana has no video URL and stays shopping / 0 policies.

Click path: Elena Deal → Quotes → Open interactive compare → tick American Integrity + Tailrow → Generate branded proposal → preview PDF. Paste/clear the video URL. Ana Deal → Compare shows her priced attempts (AI quoted $5,607.53 not bindable). Do not bind Ana.

## DIFFERENTIATOR pack E — branded proposals + hit/lost + quote compare (`cursor/diff-proposals-hit-ratio-4024`)

Merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_diff_pack_e` renumbered to `0039_diff_pack_e`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged.

- **Branded proposal PDF** from any Deal quote set: agency name / logo / color preset, side-by-side premiums, coverage summary, rule-based gap notes. Stored on Deal Attachments (`documents.slot=proposal`). Generate from Quotes, Documents, or `/deals/[id]/compare`. Elena seeds one proposal PDF plus a GeoVera compare quote (higher AOP / hurricane, no flood, Cov A $365k).
- **Hit / lost reporting:** `quotes.lost_reason` + `quote_attempt_logs.lost_reason` picklist. Admin Home widget **Hit ratio / lost business** — quote hit %, shop hit %, carrier performance, lost-reason counts. Ana declined rows seed roof / construction reasons. Ana stays a miss (quoted, not bound).
- **Quote compare screen** `/deals/[id]/compare`: interactive select + video URL stub (DIFF L) plus plain-English gap notes from rule text (deductible higher, no flood, lower Cov A, not bindable). Not an LLM. Ana compare falls back to her quoted attempt at $321,000.

Do not bind Ana.

## Claims FNOL light intake (`cursor/claims-fnol-intake-9bfe`)

DIFF K merged onto `cursor/mac-ready-batch4-7pm`. Broker log — not a claims shop. Incoming `0036_claims_fnol` renumbered to `0040_claims_fnol`. Ana stays unbound, Cov A **$321,000**.

- Additive `0040_claims_fnol`: `claims.contact_id`, loss location, reporter name/phone, `producer_id`, `producer_notified_at`. No reserve or adjuster columns.
- `/claims/new` is FNOL intake. Policy + Contact stay linked (picking a policy fills the contact). Carrier claim # is optional until the carrier assigns one.
- `/claims` is a three-column status pipeline: Inquiry → Referred to carrier → Closed. Same statuses as the existing light log. Move buttons advance the desk status.
- Saving FNOL (or moving to referred / adding a carrier #) writes an in-app `fnol` alert to the Policy/Contact owner. Header bell opens `/claims/[id]`. Nothing emails.
- Contact 360 and Policy 360 show the linked notices. Seed: Elena wind inquiry (no carrier #), Camila water `AI-CLM-19044` referred, Camila hail `AI-CLM-16220` closed. Maya gets the producer pings. Ana has zero claims.

## Open API + clean export (`cursor/open-api-export-be9f`)

DIFF I merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_api_tokens` renumbered to `0041_api_tokens`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged. No lock-in copy.

- Bearer tokens hashed in `api_tokens`. Seeded `ff_demo_admin` for Admin (Javy). Session cookie `ff_actor_id` also authenticates `/api/v1`.
- List/get: `/api/v1/contacts`, `/policies`, `/deals`, `/activities` plus `/:id`. Pagination `limit`/`offset`.
- CSV: `/api/v1/export/contacts.csv`, `/policies.csv`, `/commissions.csv`. Admin page `/settings/export`.
- Encrypted SSN / EIN / DL stay off JSON and CSV. Agents see own book only.
- `POST /api/v1/auth/token` issues another hashed Admin bearer. `/api/v1` is public at the proxy; the route still requires a token or session.

## DIFF H — coverage gaps + bind path + Fill labels (`cursor/diff-h-coverage-bind-fill-9bd3`)

Merged onto `cursor/mac-ready-batch4-7pm`. No new migration. Ana fixture untouched (unbound, Cov A **$321,000**). `bindDeal` now throws `Ana stays shopping. Do not bind this shop.` One Pipeline. Alerts off the sidebar.

- **Coverage gaps (in-force only):** Contact / Business / Deal show a plain-English panel. Rules: auto-no-home, home-no-auto, home-no-flood, no-umbrella, flood-no-home, GL/BOP-no-WC, GL-no-umbrella. Quotes, quoted status, and cancelled rows never count. Ana (0 policies) stays empty with the $321k lock sentence.
- **Quote compare:** Deal Quotes tab adds a Why-this-quote column (cheapest vs others, deductible / Cov A English, bindable vs not). Ana rows stay “Do not bind Ana.” Interactive compare + branded proposals from WAVE-1 stay.
- **Closed Won one-click bind:** Deal header form replaced with Personal · Contact + Policy vs Commercial · Business + Policy. After bind, the path sentence names the Contact/Business and Policy. Quotes stay quotes.
- **Master sheet → Fill labels:** Documents stepper is Drop source docs → Choose quoting line → Fill master sheet → Glance yellow / CHECK → Approve, then Send to Fill. Handoff buttons: Copy master sheet / Send master sheet to Fill / Open Fill window. Zero rekey — Fill reads the approved sheet, never the PDF.

## Policy version history + document versions (`cursor/policy-version-history-aa85`)

DIFF G merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_policy_doc_versions` remapped to `0042_policy_doc_versions`. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged. Elena document IDs remapped off pack E quote/proposal `…4e1`–`…4e3`.

- `policy_change_logs`: who / when / field / before / after on Policy. Sources: bind, record edit, endorsement, cancellation, non-renewal, seed.
- Save policy (`updatePolicyRecord`), bind, and `filePolicyChange` write field diffs.
- `document_versions` on Deal and Policy attachments. Replace keeps the prior file. Current `documents` row stays the latest.
- UI: Policy **Change history** timeline. Deal Documents and Policy Attachments show version + Replace.
- Seeded on Elena `HO3-ELENA-2026`: bind bound → active, premium 3120 → 2840, billing monthly → annual (Maya). Wind mit and policy dec each keep a prior copy. No Ana rows.

## DIFFERENTIATOR pack C — Smart lead routing + renewal-risk (`cursor/lead-routing-renewal-risk-5b51`)

Merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_lead_routing_renewal_risk` remapped to `0043_lead_routing_renewal_risk`. Ana fixture untouched (unbound, Cov A **$321,000**). No ML. One Pipeline. Sidebar hex unchanged.

**Lead routing.** Admin Settings → Brand / Agency → **Lead routing**. Rules match territory + written line (Home/Auto/…) + producer capacity (`#` open deals under the cap). First enabled rule by priority wins. Least-loaded producer in that territory, or a pinned producer if they still have room. Unassigned inbound / social with no connection owner runs the same engine. No match posts a `lead_offers.kind = unassigned` row on the Home lead-offer board (take ownership). Seed: Space Coast HO/Auto prefer Maya if she is under the open-deal cap; FL GL prefers Javy. Tessa Voss (Melbourne HO) routes to Maya; Grant Hobbs (Billings MT Auto) stays on the board.

**Renewal-risk.** Pure score 0–100 from days-to-renewal (flag before the 45–75 day rate-increase window), proposed premium change if known, monoline, lapse history, and no contact 60 days. Home widget **Renewal-risk flags** (My production + Retention). Account 360 Overview on Contact and Business. Hale HO (`HP-FL-88421`, +16.6%, 28 days) is Critical. Nair Auto is Elevated. Ana has 0 policies — no score, still shopping.

## DIFF J — Commission reconciliation (`cursor/commission-recon-diffj-1757`)

Merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_commission_reconciliations` remapped to `0044_commission_reconciliations`. Ana fixture untouched (unbound, Cov A **$321,000**, $0 commission). One Pipeline. Sidebar hex unchanged.

**Admin** `/commissions`: expected vs received board. Expected is the policy-rule TAC already on `commissions.amount`. Received is typed by hand. Mark short / disputed / match. No carrier download.

**Agent** `/commissions`: own earned / pending / disputed only. Short shows as pending (still owed). Other producers stay off the sheet.

**Seed shortfalls:** Shah HO (Maya) $180 / $215.60 short; Hale HO (Javy) $198 / $262.08 short; Harbor GL (Javy) $250 / $318.12 short; Elena Ruiz HO (Maya) disputed — missing AFA statement. Paid rows seed as earned. Ana is not in this set.

## DIFF F — Client portal stubs (`cursor/client-portal-stubs-3bd3`)

Last differentiator pack merged onto `cursor/mac-ready-batch4-7pm`. Incoming `0036_client_portal` remapped to `0045_client_portal`. Portal token PKs remapped off version-history `b036…` to `b045…`. Ana fixture untouched (unbound, Cov A **$321,000**). **No Ana token.** One Pipeline. Sidebar hex unchanged.

Public / token self-serve pages. Stub auth is the token in the URL — no desk password.

- `/portal` landing (agency brand) plus `/portal/[token]` home, ID cards, COI, policy change.
- Seeded tokens: Elena `elena-ruiz-2026` (ID card + change), Harbor `harbor-key-2026` (reuse `COI-20260820-0001` or request a new holder).
- Reuses the existing `CertificateStub` + `issued_certificates` row. Matching holder name reuses the stub and does not queue a duplicate.
- New COI / policy-change submissions write `portal_requests` and enqueue the existing policy work item + note + in-app task. The note has every field so the desk does not rekey. Does **not** call `filePolicyChange` (policy stays as-is until the desk files it).
- ID card: branded stub from the in-force policy; download uses the issued `policy_file` / `policy_id` document via `/api/portal/[token]/files/[id]`.
- Desk: stub link on Elena Contact, Harbor Business, and those Policies. Work queue has a Client portal requests section.

## Developer Hub core (`cursor/developer-hub-core-a882`)

Admin Settings → Developer Hub. Incoming `0048_developer_hub` remapped to `0054_developer_hub`. Tables all carry `tenant_id`. No live Zoho writes. Ana untouched.

Working: Functions CRUD + allowlisted JSON runner + execution log; org API keys (hashed, shown once); outbound webhook queue + localhost Send test; inbound Signals POST + Alert; Connections CRUD with encrypted-at-rest client secret stub. OAuth expose / Authorize is a wall. Macros / Custom Buttons / Client Scripts / Widgets are placeholder routes for sibling bots.

Seed: `echo_payload`, Deal stage ping → `http://127.0.0.1:43147/api/dev/webhooks/inbound/desk-echo`, Google Calendar connection, demo org key `ffk_devhub_demo`.

## WAVE3 leftover

DIFF WAVE-1 took **0036**–**0045**. Diff H added no migration. **0046**–**0047** landed later. AMS wave 2 took **0048**. AMS wave 3 remapped to **0051**. Next free after this merge is **0053**. Do not bind Ana (Cov A **$321,000**). One Pipeline. Alerts off the sidebar. Build green. Skipped duplicate packs A/D (`diff-pack-a-scorecards-726b`, `diff-pack-d-queue-campaigns-ccd2`).

## AMS wave 2 — book-of-business depth (`cursor/ams-wave2-book-3be9`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Quotes still do not create a Policy. No Stripe, Twilio, DocuSign, OAuth, or rater APIs.

Additive `0048_ams_wave2`:

- `policy_service_requests` — endorsement / cancel / non-renew request → in_progress → filed / withdrawn. Filing calls existing `filePolicyChange` (updates Policy + change log) and writes `activities` + `activity_logs`.
- `certificate_requests` — desk COI queue. Issue writes `issued_certificates` (stub, not licensed ACORD). Matching holder reuses the stub.
- `carrier_download_connections` — IVANS / AL3 plug. Status stays `not_connected`. Attempt import stores `needs carrier download / IVANS later`. No fake fees.

Click path:

1. Policy **HO3-ELENA-2026** — checklist: dec + ID on file, AOR missing, renewal 2027-09-01, next service task. Endorsement request is **in progress**. File it from the panel to update the same Policy.
2. **Book health** `/book-health` — active vs lapsed + missing docs (Elena AOR; Hale/Nair empty packets).
3. **Renewals** `/renewals` — Hale in 30 days ($2,184 vs $2,547). Follow up writes a Task + in-app Alert only.
4. **Certificates** `/certificates` — Harbor request for Brevard County Parks. Issue stub. Palm Bay Marina Dockage already issued.
5. **Settings → IVANS / AL3** — Not connected. Attempt import does not invent a download.

Sidebar stays `#1d4e89`. One Pipeline nav row. `getActor` still goes through `currentDeskSession`. Drizzle `alias` stays on `pg-core`.

## AMS wave 3 — servicing depth (`cursor/ams-wave3-servicing-0ccd`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. No IVANS, rater, Stripe, Twilio, or DocuSign.

Incoming `0049_ams_wave3` remapped to additive `0051_ams_wave3` (wave 4 already held 0049):

- `policy_servicing_checks` — renewal docs / inspection / mortgagee / ID cards, complete or incomplete, optional Task FK. `tenant_id` on the table.
- `policy_service_request_events` — durable endorsement / cancel / non-renew activity log.

Click path:

1. Policy **HO3-ELENA-2026** — checklist: ID cards complete, mortgagee incomplete with an in-desk Task, inspection open, renewal docs not in the 90-day window. Endorsement still **in progress**. Claims panel shows the seeded wind FNOL + timeline; new FNOL stays on this Policy.
2. Policy **HP-FL-88421** (Hale) — renewal docs due in 30 days, endorsement requested. **Do not auto-cancel.** Status stays Active.
3. **Renewals** `/renewals` — 30-day bucket has Hale ($2,184 vs $2,547). 90-day bucket has Nair. Follow-up is Task + Alert only.
4. **Book health** `/book-health` — agency vs producer rollups, lapse-risk flags (Hale Critical), monoline gaps, missing dec.
5. Harbor Key — withdrawn cancellation in the service log. GL stays in force. COI request unchanged.
6. **Settings → IVANS / AL3** — still Not connected.

Sidebar stays `#1d4e89`. One Pipeline nav row. `getActor` still goes through `currentDeskSession`. Drizzle `alias` stays on `pg-core`.

## AMS wave 4 — desk depth (`cursor/ams-wave4-depth-a034`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API.

Additive `0049_ams_wave4`:

- `policy_additional_interests` — mortgagee / additional interest / loss payee on a personal-lines Policy (`tenant_id` required).
- Service-request polish stays on `policy_service_requests` (no status rewrite). Required fields + next-step copy + in-app `review_tasks`.
- Packet checklist actions write `review_tasks` (`servicing_dec` / `servicing_id_card` / `servicing_aor`).

Click path:

1. Policy **HO3-ELENA-2026** — AOR missing with open collect task (seed proof). Dec + ID on file. Mortgagee **First Community Bank ISAOA** on the personal-lines list. Endorsement still **in progress** — do not file to “prove” cancel.
2. **Service requests** `/service-requests` — Elena in progress, Hale requested. Status chip + next-step sentence. File still calls `filePolicyChange` on the same Policy.
3. **Book health** `/book-health` — agency totals plus producer book rollup (owner). Elena AOR still in missing docs.
4. **Claims** `/claims` — FNOL pipeline + carrier-site disclaimer. Detail uses the existing intake record + timeline. No carrier API.

Sidebar stays `#1d4e89`. One Pipeline nav row. `getActor` / `isAdmin` still go through `currentDeskSession`. Drizzle `alias` stays on `pg-core`.

## AMS wave 5 — desk depth (`cursor/ams-wave5-depth-9dbf`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API. No licensed ACORD.

Additive `0050_ams_wave5` on existing tables (no second certificate table):

- `certificate_requests` / `issued_certificates` — `interest_id`, `additional_insured`, `special_wording`. Holder can pick an existing AI or add the holder onto the Policy as additional insured. Issue still writes the desk stub.
- `policy_service_requests.work_desk` — `producer` | `csr` (default CSR). Queue filter only.
- Suspense auto-opens `review_tasks` for missing **ID cards** and **AOR** when the Policy is opened. Dec stays a manual collect.
- Policy term history reads existing `policy_terms` (`prior` / `current` / `proposed`). Compare page unchanged.
- Loss-run CSV is a desk claims summary stub at `/api/policies/:id/loss-runs.csv`. Not a carrier download.

Click path:

1. Policy **HO3-ELENA-2026** — AOR suspense still open (wave 4). Term history shows prior 2025–26 ($2,640) and current 2026–27 ($2,840). Loss-run CSV lists the wind inquiry. Endorsement stays **in progress** on the **CSR** desk.
2. Policy **HP-FL-88421** — auto ID + AOR suspense tasks. Endorsement stays **requested** on the **Producer** desk. Do not file.
3. Harbor **GL-HARBOR-2026** — additional insureds **Brevard County Parks** (open COI) and **Palm Bay Marina Dockage** (issued stub now shows AI + wording). `/certificates` picker reuses those names.
4. `/service-requests?desk=csr` — Elena. `?desk=producer` — Hale.
5. Settings → IVANS / AL3 still **Not connected**.

Sidebar stays `#1d4e89`. One Pipeline nav row. Next free additive migration is **0053**.

## In-desk automations depth (`cursor/in-desk-automations-cfc4`)

Off `cursor/fitfirst-type-readability-e960`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. Sidebar hex unchanged. No Twilio / SendGrid / Mailchimp / Constant Contact.

- **Playbooks** `/automations/playbooks` — Trigger → Condition → Action that writes a desk Task (`activities`) and/or an in-app Alert. New action `task_and_alert`. Visibility `admin` | `agent` | `both`. Admin writes / toggles / **Run now**. Agents read playbooks they can see plus fired work.
- **Engine** `src/lib/automations/engine.ts` + `fire.ts`. `send_template_email` holds a draft note and posts an Alert — it never inserts a sent mail job.
- **Template library** `/automations/templates` — EN/ES preview cards. Does not send. Admin edits in Settings.
- **Paid campaigns / bulk SMS** pages stay as in-house notices. `paidVendorsAllowed()` is false.
- **Pop-up** — unread `playbook` / `automation` alerts open an in-desk dialog. Dismiss marks read. Nothing emails Javy.
- **Seed fires** (Tasks + Alerts only): Elena Closed Won (Alert, Maya); Elena renewal 60 (Task + Alert, Maya); Ana Quote Sent (Alert only, Cov A $321k, do not bind); Marcus Hale renewal 30 (Task + Alert, Javy); Robert Hale birthday (agency-wide Alert).
- `/tasks` lists open `activities` (kind=task) next to review items so playbook fires show on the existing Tasks table. `/alerts` Open jumps the related record. Chrome unchanged.
- Incoming `0048_automation_playbooks` remapped to `0052_automation_playbooks` (`guided_automations.visibility` + `automation_runs`).

## In-desk e-sign stub (`cursor/in-desk-esign-stub-fdce`)

Starts from `cursor/fitfirst-type-readability-e960`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). Dark sidebar tokens stay `#1d4e89`. Chrome Fill folder not rewritten. Mac Chrome unblock rules kept: Col-based lists compile, no vendor SDK.

- Deal Documents + Policy issued-files: upload/select a PDF packet, request signature, client or agent demo draws/types a name, mark Signed in-app.
- Status + timestamp stored on `deals` / `policies` (`esign_status`, `esign_requested_at`, `esign_signed_at`) and shown on those lists.
- Banner copy is **In-desk stub — not DocuSign**. `/sign/[token]` is public. Finish-line DocuSign / Dropbox Sign stay `not_implemented`.
- Incoming `0048_in_desk_esign` remapped to `0053_in_desk_esign`.

## Automations developer tools (`cursor/automations-dev-tools-de23`)

Fills `/automations` with power-user tools. Shares the same table names as Settings siblings `cursor/developer-hub-core-a882` (`developer_*`) and `cursor/dev-hub-macros-buttons-649d` (`desk_macros`, `desk_custom_buttons`, `desk_client_scripts`). Deep-links: Settings → Developer Hub → Automations pages. Sibling paths `/settings/developer/*` and `/settings/developer-hub/*` redirect here.

- Playbooks: existing guided automations (Task + Alert). Campaign sequences + EN/ES templates stay. Paid SMS / Mailchimp stay connect stubs.
- Macros: manual only. ≤1 email stub, ≤3 field updates, ≤3 tasks. **Run Macro** on Leads / Contacts / Deals. Ana records are skipped.
- Functions: Button / Automation / Schedule / Standalone. Body persists. Test log. Standalone REST at `/api/dev/functions/[apiName]/execute` with an org API key.
- Webhooks, org API keys, custom buttons, client scripts, connections (OAuth wall).
- Incoming `0048_developer_hub` remapped to `0055_developer_hub` (superset of `0054`; adds macros / buttons / scripts / widgets). Seed does not touch Ana. Sidebar stays `--ff-sidebar: #1d4e89`.

## Developer Hub macros / buttons (`cursor/dev-hub-macros-buttons-649d`)

List-page **Run Macro** on Leads / Contacts / Deals. Coverage A client-script warning on Master risk is `showError` only when empty — Ana Cov A **$321,000** is never overwritten. Incoming `0048_dev_hub_macros_buttons` remapped to `0056_dev_hub_macros_buttons`. One Macros card on Automations.

## Import / Export hub (`cursor/import-export-hub-41c4`)

Admin CRM + AMS CSV packs at `/settings/import-export`. Incoming `0048_import_export_jobs` remapped to `0057_import_export_jobs`. Ana fixture is not in the export packs.

## Pipeline funnel colors (`cursor/pipeline-funnel-colors-32ce`)

Status chips read as badges with calm borders. Incoming `0048_pipeline_stage_color` remapped to `0058_pipeline_stage_color`. One Pipeline nav row. Sidebar stays `#1d4e89`.

## CRM depth API wall (`cursor/crm-depth-api-wall-7faa`)

Outbound comms jobs + CRM signals stop at the API wall. Incoming `0048_comms_outbound_jobs` remapped to `0059_comms_outbound_jobs`. Quotes still do not create a Policy. Ana unbound.

## AMS desk polish (`cursor/ams-desk-polish-5344`)

Side branch off `cursor/fitfirst-type-readability-e960`. Additive only. No new migration. Ana fixture untouched (unbound, Cov A **$321,000**). One Pipeline. One Settings. Sidebar stays `#1d4e89`. Quotes still do not create a Policy.

- Policy record files endorsement / cancellation / non-renewal and shows the outcome on that same Policy (in-force vs off the book).
- Renewal compare uses the premium-change summary (Hale +$363 / +16.6%, Nair −$72 / −5.0%).
- Work queue lists flags, notes, assignee, and in-app pings. `notifyAssignee` writes `alerts.user_id` + `recipient_user_id` so the bell is not agency-wide. `seedWorkQueue()` is wired after Elena exists.
- Claims log is Inquiry / Referred / Closed with Add FNOL. Claim detail uses the FNOL record.
- Commissions pending vs paid cards filter the sheet. Payable/held stay pending. Mark paid does not change Policy status.
- Sheet health blockers link to `?tab=quote-sheet&field=` and `#sheet-field-*`.

## Connect stubs hub (`cursor/connect-stubs-hub-1028`)

Starts from `cursor/fitfirst-type-readability-e960`. Additive only. Ana fixture untouched (unbound, Cov A **$321,000**). Dark sidebar stays. No live OAuth, API keys, Stripe, or Twilio.

- Settings → **Integrations** keeps the existing catalog chrome. Cards now include Zoho Mail/Calendar and rater (EZLynx / QuoteRush) plus the existing Google, Outlook, social/GBP, SMS, and e-sign stubs.
- Each card: Connect / Disconnect demo toggle, **Agency pays the vendor.**, status **Connected (demo)** vs **Not connected**.
- Connecting stays Admin-only. GBP monitor gate stays on Settings → Social.
- Zoho Mail/Calendar are inbox/calendar plugs — not a Zoho CRM sync. Raters do not call EZLynx or QuoteRush.
- Settings overview still links to `/settings/integrations`. No visual redesign.

Do not bind Ana.

## Nav cleanup + Phone / Inbox stubs (`cursor/nav-phone-inbox-stubs-8078`)

Feel-desk unblock on `cursor/full-day-batch4-57f6`. Ana untouched. Darker blue sidebar unchanged. One Pipeline row.

- Left-nav group **People** → **Accounts**. Children stay Contacts (`/contacts`) and Businesses (`/accounts`). Contact and Business modules were not deleted.
- Sidebar **Search** removed. Top-bar Smart Search is the only search.
- `/phone` — connect-later wall (BYO line later, no Twilio buy) + dialer stub. Outcome + notes write `activities` / `activity_logs` via `saveCallOutcome`. Existing call log (`listCallLog`) stays on the page. `/settings/phone` is unchanged.
- `/inbox` — label Inbox, eyebrow **Envoys**. Connect work email later. Queued inbound stubs from seed: activity inbound email/SMS + `lead_offers.kind = inbound_email` (Renee Colbert).
- Tasks, Work queue, Alerts, Carriers, Documents stay where Javy liked them.

## Feel-pass consolidate Sep 5b (`cursor/feel-pass-consolidate-sep5b-6195`)

Post-feel-pass tip for Javy’s Air retest. Start: `cursor/feel-pass-consolidate-sep5-fed3`. Fast-forwarded `cursor/ams-wave9-depth-de2e` (already remapped `cursor/ams-wave8-depth-6481` to `0062_ams_wave8` plus additive `0063_ams_wave9`). Fast-forwarded `cursor/error-sweep-sep5-31ef` (desk_agents insert collision — Reviews no longer 500s). Fast-forwarded `cursor/error-sweep-sep5-follow-31ef` (Developer Hub / Automations / template / fill UUID 404s instead of 500s). Both tip names point at this same commit.

`cursor/ams-wave7-depth-da3a` not merged: Records already lists Suspense / Notices / Endorsements; `/claims/diary` is already reserved in the record-id 404 gate. da3a nav would regress Accounts → People, restore sidebar Search, and split Settings into multiple left-nav rows.

Feel-desk hygiene on this tip:
- No duplicate re-exports in `domain.ts`; AMS constants re-export once from `domain-ams`.
- No duplicate `OWNER_*` in `ids.ts`.
- `seed.ts` imports every symbol it uses. Ana helpers come from `@/lib/quote-sheet/ana-home`. Deals always write `pipelineId`. Never insert `pipeline_stages` without `pipeline_id`.
- Additive migrations only. Wave 8 incoming `0053` remapped to `0062`; wave 9 is `0063`. Nothing dropped.
- Drizzle `alias` stays on `pg-core`. `getActor` / `isAdmin` still go through `currentDeskSession`.
- One Pipeline nav row. One Settings entry. Accounts (not People). Sidebar `#1d4e89` — never `#d6e8f8`.
- Ana Dib HO3 stays shopping / unbound / Cov A **$321,000**. Quotes never create a Policy.

Mac Chrome (Air **and** mini):

```
cd ~/FitFirst
git fetch && git checkout cursor/feel-pass-consolidate-sep5b-6195 && git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

Then Chrome http://localhost:43147 — **javy@fitfirst.local** / **javy**. Do not bind Ana.

## Feel-pass FIX pack A — Home (`cursor/fp-home-layouts-resize-a094`)

Off `cursor/feel-pass-consolidate-sep5b-6195`. Function first. No Home redesign.

- Layout dropdown: built-in presets stay. **Custom layouts** — create + name the current board (tile order/span + hidden cards), rename later. Rows live on `user_home_layouts` (`tenant_id` + `user_id`). Active id + **Resize tiles** flag are additive columns on `user_dashboard_prefs`.
- Widget settings: **Resize tiles** toggle. When on, drag a tile corner to snap to a preset (kept 1×1 / 1×2 / 2×1 / 2×2, plus 1×3 / 2×3 / 3×1 / 3×2 / 4×1 / 4×2). Tiles stay independent (`self-start`, no CSS row-span).
- Additive only: `0064_home_custom_layouts`. Nothing dropped. Sidebar `#1d4e89`. Ana Dib HO3 stays shopping / unbound / Cov A **$321,000**. Quotes never create a Policy.

Mac Chrome (Air **and** mini):

```
cd ~/FitFirst
git fetch && git checkout cursor/fp-home-layouts-resize-a094 && git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

Then Chrome http://localhost:43147 — **javy@fitfirst.local** / **javy**. Home → Layout → Create layout… / Rename. Widget settings → Resize tiles. Do not bind Ana.

## Feel-pass consolidate Sep 5 (`cursor/feel-pass-consolidate-sep5-fed3`)

One Mac Chrome tip for Javy’s Air + mini. Base: `cursor/ams-wave5-depth-9dbf` (builds; includes wave2, wave4, batch4). Additive only. Ana fixture untouched (shopping / unbound / Cov A **$321,000**). Quotes never create a Policy. One Pipeline nav. One Settings entry. Sidebar `#1d4e89` — never `#d6e8f8`. `getActor` / `isAdmin` still go through `currentDeskSession`. Drizzle `alias` stays on `pg-core`. Incoming colliding `0048`/`0049` SQL remapped sequentially to **0051–0059**. Wave 6/7 `0051`/`0052` remapped to **0060–0061**. No migration dropped. `0055_developer_hub` (power-user superset after `0054`) wraps shared FK adds in `DO $$ … EXCEPTION WHEN duplicate_object` so `db:migrate` can apply both files.

### Merged (schema first, then features, then UX)

AMS:
- `cursor/ams-wave2-book-3be9` (already on wave5)
- `cursor/ams-wave3-servicing-0ccd` → `0051_ams_wave3`
- `cursor/ams-wave4-depth-a034` (already on wave5)
- `cursor/ams-wave5-depth-9dbf` (base)
- `cursor/ams-desk-polish-5344` (bc-406eb30f deeper AMS polish)
- `cursor/ams-wave6-depth-1040` → `0060_ams_wave6`
- `cursor/ams-wave7-depth-34d6` → `0061_ams_wave7` (sibling `cursor/ams-wave7-depth-da3a` not deleted)
- `cursor/ams-wave8-depth-6481` → `0062_ams_wave8` (this AMS wave 9 session)
- `cursor/ams-wave9-depth-de2e` → `0063_ams_wave9`

CRM / Quote / function:
- `cursor/quote-sheet-fill-appetite-6178`
- `cursor/quote-sheet-edit-master-risk-6051`
- `cursor/in-desk-automations-cfc4` (`513dbba`) → `0052_automation_playbooks` — **ancestor of this tip**
- `cursor/automations-hub-4d87` (`7805e58`) — **ancestor of this tip** (not re-merged; already on the automations line)
- `cursor/connect-stubs-hub-1028`
- `cursor/in-desk-esign-stub-fdce` → `0053_in_desk_esign`
- `cursor/crm-depth-api-wall-7faa` → `0059_comms_outbound_jobs` (this-session desk branch)

Developer / Settings:
- `cursor/developer-hub-core-a882` → `0054_developer_hub`
- `cursor/automations-dev-tools-de23` (`6132ab1`, bc-60c542ef power-user fill, **+6274 / −33 vs wave5**, 76 files) → `0055_developer_hub` — **must-include ancestor of this tip**
- `cursor/dev-hub-macros-buttons-649d` → `0056_dev_hub_macros_buttons`
- `cursor/settings-ia-cards-2ba0`
- `cursor/import-export-hub-41c4` → `0057_import_export_jobs`

UX feel-pass:
- `cursor/home-widget-ux-f053`
- `cursor/pipeline-funnel-colors-32ce` → `0058_pipeline_stage_color`
- `cursor/quotes-list-collapse-253c`
- `cursor/commissions-cleanup-869a`
- `cursor/calendar-toolbar-rows-1432`
- `cursor/nav-phone-inbox-stubs-8078`
- `cursor/policy-detail-info-433d`

Skipped: product-site / marketing branches. Side branches were not deleted.

Settings IA: **one** Setup card **Automations & Developer** (`automations-dev`). Macros once at `/automations/macros`. `/settings/developer-hub/*` remains an alias, not a second Settings card. Left-nav still one Settings + one Automations.

Seed re-run: `seed()` is mutexed so parallel db tests do not unique-crash. `seed-lifecycle` deletes Elena `signature_envelopes` before documents (in-desk e-sign sample packets). Carrier appointments upsert on `(tenant, carrier, line)`.

Mac Chrome (Air **and** mini):

```
cd ~/FitFirst
git fetch && git checkout cursor/feel-pass-consolidate-sep5-fed3 && git pull
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

Superseded for Air retest by **`cursor/feel-pass-consolidate-sep5b-6195`**. Then Chrome http://localhost:43147 — **javy@fitfirst.local** / **javy**. Do not bind Ana.

## AMS wave 6 — desk depth (`cursor/ams-wave6-depth-1040`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API. No licensed ACORD. Wave 2–5 surfaces stay.

Incoming `0051_ams_wave6` remapped to `0060_ams_wave6` on existing tables plus one notice diary:

- `certificate_requests` / `issued_certificates` — `waiver_of_subrogation`, `primary_noncontributory`. Palm Bay issued stub has both. Holder directory is `/certificates/holders`.
- Agency suspense board `/suspense` reads open `review_tasks` (`servicing_id_card` / `servicing_aor`). Complete marks the task collected. Dec stays a manual collect.
- `policy_notices` — cancellation / non-renew / reinstatement diary (`drafted` / `mailed` / `withdrawn`). Mail does **not** call `filePolicyChange`. Hale seed is a drafted non-renew.

Click path:

1. Policy **HO3-ELENA-2026** — AOR suspense still open. Term history prior + current. Loss-run CSV. CSR endorsement **in progress**. Do not file. Do not bind Ana.
2. Policy **HP-FL-88421** — auto ID + AOR suspense. Drafted non-renew notice. Producer endorsement **requested**. Do not file or mail.
3. `/suspense` — Elena AOR + Hale ID/AOR. `/certificates/holders` — Brevard open, Palm Bay issued with waiver + PNC.
4. `/notices` — Hale drafted non-renew. Settings → IVANS / AL3 still **Not connected**.

Sidebar stays `#1d4e89`. One Pipeline nav row. Next free additive migration is **0062**.

## AMS wave 7 — desk depth (`cursor/ams-wave7-depth-34d6`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API. No licensed ACORD. Wave 2–6 surfaces stay.

Incoming `0052_ams_wave7` remapped to `0061_ams_wave7`:

- `claim_diary` — follow-up / insured call / carrier status / docs requested / note. Open → completed. Completing does **not** change claim status or file FNOL. Board is `/claims/diary`. Elena wind inquiry has an open docs row.
- `endorsement_drafts` — wording stub (`drafted` / `ready` / `withdrawn`) optionally tied to a service request. Ready / withdraw does **not** call `filePolicyChange`. Elena seed is a drafted mortgagee stub on the in-progress CSR endorsement.
- Agency suspense board ages days-open vs the desk clock (`current` 0–7 / `watch` 8–14 / `aging` 15–29 / `stale` 30+). `/suspense?age=stale` is Hale ID.
- `/book-health?owner=` filters missing packets by producer. Agency totals stay. Click the producer name.

Click path:

1. Policy **HO3-ELENA-2026** — AOR suspense still open (watch). Term history prior + current. Loss-run CSV. CSR endorsement **in progress** plus drafted mortgagee wording. Do not file. Do not bind Ana.
2. Policy **HP-FL-88421** — auto ID (stale) + AOR (aging) suspense. Drafted non-renew notice. Producer endorsement **requested**. Do not file or mail.
3. `/claims` → Elena wind inquiry → open docs diary. `/claims/diary` lists it. Completing does not file FNOL.
4. `/endorsements` — Elena drafted mortgagee stub. `/book-health?owner=` filters missing docs. Settings → IVANS / AL3 still **Not connected**.

Sidebar stays `#1d4e89`. One Pipeline nav row. Wave 8 remapped to **0062**. Wave 9 is **0063**. Next free additive migration is **0064**.

## AMS wave 8 — desk depth (`cursor/ams-wave8-depth-6481`)

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API. No licensed ACORD. Wave 2–7 surfaces stay.

Incoming `0053_ams_wave8` remapped to `0062_ams_wave8`:

- Service timeline reads existing `activity_logs` for AMS servicing events. Board is `/service-timeline`. Policy 360 has the same log plus a servicing note that writes `service_note`. Notes do **not** file and do not bind. Elena seed is a CSR note on the in-progress endorsement.
- `certificate_holder_contacts` — name / email / phone / address CRUD. Archive does not issue or withdraw a stub. `certificate_requests.holder_contact_id` links Brevard to the open Harbor COI. Palm Bay is the issued-stub contact.
- `renewal_queue` — upcoming / quoting / offered / accepted / lost. Accept does **not** bind and does not change Policy status. Hale seed is quoting; Nair is upcoming. No rater.

Click path:

1. Policy **HO3-ELENA-2026** — AOR suspense still open (watch). Term history prior + current. Loss-run CSV. CSR endorsement **in progress** plus drafted mortgagee wording. Service timeline shows the CSR note. Do not file. Do not bind Ana.
2. Policy **HP-FL-88421** — auto ID (stale) + AOR (aging) suspense. Drafted non-renew notice. Producer endorsement **requested**. Renewal queue **quoting**. Do not file, mail, or accept.
3. `/certificates/holders` — Palm Bay + Brevard contacts with email/phone. Edit/archive does not issue a COI. `/renewals/queue` — Hale quoting, Nair upcoming.
4. `/service-timeline` — Elena note + Hale queue move. Settings → IVANS / AL3 still **Not connected**.

Sidebar stays `#1d4e89`. One Pipeline nav row.

## AMS wave 9 — desk depth (`cursor/ams-wave9-depth-de2e`) — consolidator pickup

Owner: AMS. Function first. Did not redesign chrome. Did not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Ana stays shopping / unbound / Cov A **$321,000**. Did not file or cancel Elena `HO3-ELENA-2026` or Hale `HP-FL-88421`. IVANS / AL3 stay **Not connected**. No fake fees. No carrier claims API. No licensed ACORD. No Stripe. Wave 2–8 surfaces stay.

Additive `0063_ams_wave9` after remapped wave 8:

- `policy_inspections` — 4-point / wind mit / roof / photo. requested → scheduled → completed / waived. Completing does **not** call `filePolicyChange`. Board is `/inspections`. Elena seed is a scheduled roof; Hale is a requested wind mit.
- `policy_installments` — agency bill / direct bill. scheduled → due → received / past_due / waived. Marking received does **not** collect money and does not change Policy status. Board is `/installments`. Elena seed is a scheduled October installment; Hale is past-due August.

Click path:

1. Policy **HO3-ELENA-2026** — AOR suspense still open (watch). CSR endorsement **in progress**. Scheduled roof inspection. October agency-bill installment. Service timeline shows the note + inspection + installment. Do not file. Do not bind Ana.
2. Policy **HP-FL-88421** — auto ID (stale) + AOR (aging). Drafted non-renew. Renewal queue **quoting**. Requested wind mit. Past-due August installment. Do not file, mail, accept, or mark received.
3. `/inspections` — Elena roof scheduled; Hale wind mit requested. Completing does not file.
4. `/installments` — Elena October scheduled; Hale August past due. Settings → IVANS / AL3 still **Not connected**.

Sidebar stays `#1d4e89`. One Pipeline nav row. Next free additive migration is **0064**.

## Desk error sweep follow (`cursor/error-sweep-sep5-follow-31ef`)

On top of `cursor/feel-pass-consolidate-sep5b-6195` (already includes Reviews `desk_agents` fix). Fast-forwarded onto that tip name — both branches point at the same commit. Did not bind Ana.

**Patched remaining 500s** (bad UUID on Developer Hub / template / fill):
- `/automations/functions|webhooks|connections/:id`
- `/settings/developer/functions|webhooks|connections/:id`
- `/settings/email-templates/:id`
- `/documents/fill/:slug?fillId=`

Loaders now `isUuid()`-guard. Proxy 404s those record paths the same way as Contact/Deal/Policy.
