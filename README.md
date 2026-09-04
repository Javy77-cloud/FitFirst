# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

**Mac desk-test branch:** `cursor/mac-ready-batch4-7pm` (DIFF WAVE-1 consolidator + Diff H/G + Pack C routing)

**DIFF WAVE-1 (this branch):** Producer scorecards + Glance, E&O (`0036`), campaigns (`0037`), quote compare + video (`0038`), hit/lost proposals (`0039`), Claims FNOL (`0040`), Open API + CSV export (`0041_api_tokens`), Diff H coverage gaps + Closed Won bind path (`cursor/diff-h-coverage-bind-fill-9bd3`, no migration), Diff G policy + document version timelines (`0042_policy_doc_versions`), and Pack C lead routing + renewal-risk (`cursor/lead-routing-renewal-risk-5b51`, incoming `0036` remapped to `0043_lead_routing_renewal_risk`). Ana stays unbound at Cov A **$321,000**. `bindDeal` refuses that shop. Sidebar `#c5ddf4`. One Pipeline. Alerts off the sidebar.

**Wave 2 merged:** Deal quote PDF view / email / SMS / print (`cursor/deal-docs-pdf-view-ba1b`), DOC → master sheet fill (`cursor/doc-master-sheet-fill-1202`, `0034_fill_feedback`), and Fill Learning (`cursor/fill-learning-log-efeb`, incoming `0021` renumbered to `0035_fill_learning_logs`). Next free migration is **0044**. See `COORDINATION.md`.

**DIFF H:** Rule-based coverage-gap English on Contact / Business / Deal (auto-no-home, flood, umbrella, GL-no-WC — in-force only). Deal quote compare explains cheapest / deductibles / bindable in English. Closed Won is one-click **Contact + Policy** or **Business + Policy**. Documents stepper labels the master sheet → Fill path (zero rekey). Ana stays unbound at Cov A **$321,000**; `bindDeal` refuses that shop.

**Policy change history + document versions (DIFF G):** Policy records keep a field-level timeline (who / when / before / after) on bind, Save policy, and endorsement / cancel. Deal and Policy attachments keep prior copies when you replace a file. Seeded on Elena `HO3-ELENA-2026` (wind mit + issued dec have a prior version). Ana stays unbound. Incoming `0036_policy_doc_versions` remapped to `0042_policy_doc_versions`.

**Pack C — lead routing + renewal-risk:** Admin Settings → Brand / Agency → Lead routing (territory + line + capacity). Home **Renewal-risk flags** plus Contact / Business Overview cards. Hale HO is Critical; Ana has 0 policies so no score. Incoming `0036_lead_routing_renewal_risk` remapped to `0043_lead_routing_renewal_risk`.

**Batch 4 carrier portal credentials:** Admin-only quoting-portal username + password, AES-256-GCM at rest (`CARRIER_SECRETS_KEY` or `PII_ENCRYPTION_KEY`). Agency code and portal URL stay visible to Agents for quoting. Seeded demo logins: American Traditions (`FF-AT-1048`) and People's Trust (`FF-PT-2201`). Agents never see, reveal, or edit the password. Quote handoff readiness is an Admin stub — Chrome Fill already exists separately. Ana stays unbound at Cov A **$321,000**.

**Batch 4 top chrome:** InsuredMine-style top-right utilities on the desk header (Refresh, alerts, What’s New, profile, recently accessed, quick add, Support stub). Same chrome for Admin and Agent. Sidebar stays light-blue `#c5ddf4` with near-black ink. Alerts is not a left-nav row — the header bell owns alerts.

**Batch 4 home:** denser agent-scoped Home (KPI cards, charts, leaderboard, contest, birthdays / turning 65, dashboard presets). Admin office / territory book filter. Admin can share an **inbound email** onto the lead-offer board; the agent Claims it and gets a Lead + in-app notify. **Pack C:** unassigned inbound also auto-routes by territory, written line, and producer capacity; a miss lands on the same board. Home + Account 360 show a rule-based renewal-risk score (days to renewal, premium change, monoline, lapse, no contact 60d) — not AI. Same blue/orange desk. Ana stays unbound at Cov A **$321,000**.

**Batch 4 documents:** Forms nav is now **Documents** (Forms + Library areas inside). Deal Documents and issued quote PDFs open in-browser (`/files/[id]` + `/api/files/[id]`), download, and offer Email / SMS / Print stubs. Elena’s Melbourne HO3 deal seeds two real quote PDFs.

**Deal PDF view (7pm feel-pass):** Click a quote PDF on Deal → Documents to preview it. `/api/files/[id]` serves the bytes with the right Content-Type (`application/pdf` when the file is a PDF, including leftover text stubs wrapped for preview). Download uses `?download=1`. Email and SMS open the existing desk compose stubs; Print opens the preview and the browser print dialog. Unified Deals-list multi-doc upload is unchanged. Ana stays unbound.

**Batch 4 automations:** `/automations` hub — campaign sequences (lead nurture, quote follow-up, 60/30 renewal, cross-sell, review ask), campaigns, bulk SMS stub, work-email templates, guided builder, signature approval.

**DIFF D priority queue + sequences:** Work queue leads with a renewal + $ at risk board (Due / Priority / Status / $ / Account). Campaign engine at `/automations/sequences` is five insurance sequences as Task + email template stubs with On/Off. Additive `0036_campaign_sequences`. Ana stays unbound at Cov A **$321,000**.

**Batch 4 social:** `/social` pulse + Settings → Social / GBP connect stubs. Inbound inquiry → Lead + in-app notify. Agency inbound stays unassigned until Admin awards it.

**Batch 4 company meetings:** Admin Calendar **Company meeting** / **Training** with video URL and invite Whole agency / Office / Territory / Management. Invited agents get an in-app alert and the event. Personal Video / In-Home / In-Office stay.

**Batch 4 People / Agents:** Admin Settings → People / Agents — create, freeze, notify, password reset, MFA enroll stubs, and recovery links. Javy and Maya stay enrolled so the Mac desk still opens. Ana stays unbound at Cov A **$321,000**.

**Batch 4 MFA / recovery:** Password is required on both login cards, then 2-step (SMS stub, email stub, or TOTP). Settings → Profile and Settings → Security enroll and manage 2FA. Admin recovery stubs live on People / Agents (`/login/recover` plus `/recover/password` and `/recover/mfa`). `FF_MFA_DEMO_BYPASS=1` (default) skips the second prompt so Mac desk-test can open. Set `0` to type a TOTP code (seed secret `JBSWY3DPEHPK3PXP`).

**PII at rest:** SSN, EIN/FEIN, and driver license numbers are AES-256-GCM encrypted with `PII_ENCRYPTION_KEY` before write. Postgres stores ciphertext + IV + last4 only. Lists show `***-**-1234` (or EIN/DL mask). Reveal is Admin or owning Agent and writes `pii_reveal_logs` (no decrypted value). Ana has no SSN. Elena demo SSN is fake encrypted `000-00-4444`. Harbor / Ruiz Tile EINs and Soto DL are sealed at seed.

Login is required. `src/proxy.ts` plus session guards enforce Admin vs Agent — not CSS.

Contact record: Ask a teammate is Admin-only on every record. Email / Call / SMS stay. No typed email/SMS log — timeline fills when the desk sends or receives. SMS and email opt-out tracking on the contact. Left menu highlights the active module (`/contacts/*` → Contacts). Leads list/detail show the related deal’s pipeline stage. Column pickers include that module’s create/edit form fields.

Deals list has one upload: pick an existing Deal by person or business name, then add typed file lines (4-point, wind mit, current policy, quotes, permits, hand notes, dec pages, signed app). Inside the Deal: Source documents, Issued quote PDFs, and Signed app. Ask a teammate and email/SMS logs are off Quote Sheet, Markets, and Quotes. Master risk is Admin-only at Settings. E-sign stubs are DocuSign / Dropbox Sign BYO.

Policies are Life / Health / P&C with family fields, Zoho-style auto name, status colors (Active green · Lapse/Bound yellow · else red), term by family, multi-file attach, and a commission block. Cov A stays on quoting only. Policy records show auto activity — no Ask a teammate, no typed SMS/call/email log. Settings → Global lists holds policy types, sub-types, terms, statuses, and file categories (carriers stay linked). Home is an agent-scoped AMS dashboard: own-book KPIs (active accounts, in-force premium, policies, ratios, new business / renewals / cancellations with MoM, carrier count), a pipeline strip, carrier + line charts (policy-type donut stays), a top-10 production leaderboard, a reward/contest board, birthdays, and turning-65. Admins toggle **My book** vs **Agency-wide**. Users pick **My production**, **Pipeline focus**, or **Retention / renewals**, then hide cards in Widget settings. Management can post **lead offers** (language / license) for agents to claim; Admin awards those. Admin can also share an **inbound email** onto the board so the right agent can take ownership of the Lead. Charts use brighter blue/orange/teal series on the same cream desk. Settings → Agency can pin 1–2 company widgets on agent home. Home Needs attention filters Overdue / This week / This month / Next month. Calendar buttons are Previous month / Next month; you can delete an event and + Add any type. Quote sections say Expand / Collapse.

**E&O Compliance (Admin):** `/compliance` — append-only trail of client email / SMS / call / meeting / document view / reveal PII / policy change (who, when, what, record ids). Live gap flags: no activity 90 days before renewal, Bound/Pending missing a signed app, Quote Sent with no follow-up task. Flags also land in Alerts for Javy. Nothing emails. Agents cannot open the page.

Ana Dib stays Quote Sent / unbound, Cov A **$321,000**. Do not bind her. Do not edit the Ana fixture. No live Zoho.

## Run locally (Mac)

Stop the current `next dev` on **43147**, then:

```bash
cd ~/FitFirst && git fetch origin && git checkout -B cursor/mac-ready-batch4-7pm origin/cursor/mac-ready-batch4-7pm && cp -n .env.example .env && npm install && npm run db:migrate && npm run db:seed && npm run dev -- --port 43147
```

Keep `PII_ENCRYPTION_KEY` from `.env.example` (64 hex chars — local Mac demo key, not production). Changing it makes existing ciphertext unreadable; re-run `db:seed`. Postgres stays on `DATABASE_URL` (default `postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst`).

Hard-refresh Chrome. Settings → Social: Facebook / Instagram / GBP are seeded connected. As Maya, GBP is locked until Javy saves **Allow agents to monitor GBP**. Social pulse and Home show demo numbers. Open as Lead from an Instagram inquiry lands on Priya Shah.

Batch 3 Mac desk-test (no social) stays on `cursor/mac-ready-batch3-7pm`. Do not edit the Ana Dib fixture.

If `db:migrate` / `db:seed` fail after a consolidate pull (missing `deals.account_kind` or similar), reset the local database and run migrate + seed again. Do not edit the Ana Dib fixture.

**Docker Postgres (this repo):**

```bash
docker compose down -v
docker compose up -d db
# wait until healthy, then:
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

**Local Homebrew / Postgres.app:**

```bash
dropdb -h 127.0.0.1 -U fitfirst fitfirst || true
createdb -h 127.0.0.1 -U fitfirst fitfirst
# or, as the postgres superuser:
# psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS fitfirst;"
# psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE fitfirst OWNER fitfirst;"
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

**PII at rest:** SSN, EIN/FEIN, and driver license numbers are AES-256-GCM encrypted with `PII_ENCRYPTION_KEY` before write. Postgres stores ciphertext + IV + last4 only. Lists show `***-**-1234` (or EIN/DL mask). Reveal is Admin or owning Agent and writes `pii_reveal_logs` (no decrypted value). Ana has no SSN. Elena demo SSN is fake encrypted `000-00-4444`. Harbor / Ruiz Tile EINs and Soto DL are sealed at seed.

Open [http://localhost:43147](http://localhost:43147). `/login` requires a **password** on both cards, then 2-step unless demo bypass is on:

**2FA / recovery:** Settings → Security enrolls SMS stub, email stub, or TOTP. The desk stays gated until 2FA is enrolled. Seeded Javy and Maya are already enrolled; `FF_MFA_DEMO_BYPASS=1` (default) skips the second prompt so Mac desk-test can open. Set `FF_MFA_DEMO_BYPASS=0` to type a TOTP code (seed secret `JBSWY3DPEHPK3PXP`). Admin → Settings → People / Agents can send a password-reset stub, an MFA-reset stub (`/recover/password`, `/recover/mfa`), or force re-enroll. Invite / reset / recover stubs also live at `/login/invite`, `/login/reset`, and `/login/recover`. Links are shown on the desk — nothing emails.

`/login` cards:

- **Admin** — Javy Rivera (`javy@fitfirst.local` or username `javy` / `javy`). Whole book. Settings, People / Agents, integration connect, global lists, Ask a teammate, appetite/carrier edit.
- **Agent** — Maya Chen (`maya@fitfirst.local` or username `maya` / `maya`). Own book CRM, pipeline deals, calendar items, and client email/SMS when the agency line is connected. Cannot open Admin Settings, Ask a teammate, agency connect, or global list edits.
- **Frozen demo** — Luis Vega (`luis@fitfirst.local` / username `luis`). Frozen. Cannot sign in until Admin unfreezes.

**Settings → People / Agents** (`/settings/agents`) is Admin-only. Create an agent (username or email; they set the password on the invite stub, then enroll MFA). List shows Active / Frozen / Removed and 2-step Enrolled / Pending. Actions: Freeze, Unfreeze, Remove (soft), Notify, Reset password stub, MFA recovery stub, Force re-enroll MFA, Open performance report. Javy is enrolled TOTP; Maya enrolled email; Nora Frost is pending invite + MFA. Privilege toggles: can access modules, can see agency widgets, office / territory hooks.

Leads are the person record (name, DOB, contact, address, insurance wanted). Deal-level document upload still requires an existing Deal name. The left-nav **Forms** row is now **Documents** (`/documents`). Inside: **Forms** (ACORD, cancellation, AOR, fillable + Scan & suggest) and **Library** (marketing, carrier flyers, appetite guides, misc). Folders nest; create, rename, and move stay inside one area. `/forms` redirects to Documents → Forms. Quote Sheet fill stays at `/forms/[slug]`. Ana stays untouched.

Click path and leftover bugs live in `COORDINATION.md`.

**Settings → E-sign** is Admin BYO for DocuSign or Dropbox Sign (stub only). **Settings → Master risk** is the Admin appetite worksheet — not a Deal tab.

Communications (email, SMS, calls, meetings, tasks) write a durable log on the Contact, Deal, Policy, Lead, or Business record — inbound and outbound email stay as one conversation. No live Twilio or SendGrid.

**Calendar** is a real month / week / day board with hourly slots, type colors, filters, in-place edit, drag-drop reschedule, delete, and **+ Add event** for any type. Admins also add **Company meeting** or **Training** (video URL + invite Whole agency / Office / Territory / Management). Invited agents get an in-app alert and the event on their calendar; they open the video from the event. Personal Video / In-Home / In-Office meetings stay. Previous month / Next month (and week/day) are labeled. Google Calendar stays a stub.

**Phone** is a call log (duration + outcome, attached to Contact / Policy / Deal / Lead / Business). Admin Settings can mark a Twilio / Vonage / BYO trunk as connected — stub only; the agency pays later. Nothing dials.

**Contact record** is Zoho-style: a left jump menu lists Overview, Contact information, Address, Policies, Deals, Businesses, Locations, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Click jumps to that section. There is no typed activity log — work done from the desk (email, SMS, task, meeting, click-to-call) saves onto that contact’s Timeline. Ana stays **Not a client** with **0 policies**. No live Zoho.

**Business record** mirrors that jump layout: Overview, Business information, Address, Policies, Deals, People, Locations, Certificates, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Harbor Key Marine LLC stays **Client** with **GL-HARBOR-2026**.

List sheets share one header control: click a column to sort A→Z / Z→A, or open the header menu to pin it. The Columns picker stays on the title row.

Quote tracking / Quote Sheet / deal Quotes sections fold when they do not need attention. Claims log is a broker FNOL desk: intake form, inquiry → referred to carrier → closed pipeline, carrier claim #, Policy + Contact links, and an in-app producer ping. FitFirst does not file FNOL, set reserves, or assign adjusters. Commissions filters by Life / Health / P&C plus line subfilters and last/next windows. Ana stays shopping / $0 commission / unbound.

Settings has a nested left menu: **People / Agents**, Communications (email, SMS, phone, video), **Integrations** catalog, Lines / Global lists, Brand / Agency (chrome, **Offices**, **Territories**), and Admin vs Agent prefs.

**People / Agents (Admin).** Settings → People / Agents. Create a producer, freeze or remove a login, send an in-app note, push a password reset stub, and enroll MFA (authenticator / email / SMS stubs). Recovery links are Admin-only. Seeded: Javy and Maya enrolled; Luis Vega frozen; Nora Frost pending MFA.

**Offices + Territories (Admin).** Settings → Agency → Offices / Territories. An office has a name, state(s), address, and optional timezone. Agents can sit in more than one office, including desks in different states. A territory has a name, states/counties or a freeform geo label, and optional linked offices. Admin assigns people on those pages. Home (Admin) can filter Company-wide, per office, or per territory — helpers live in `src/lib/org` for other bots. Seed: Palm Bay FL (Javy primary + Maya) and Savannah GA (Javy); Space Coast territory linked to Palm Bay. Agents still cannot open Admin Settings. The catalog lists Gmail, Outlook, Yahoo, Mailchimp, Constant Contact, SendGrid, Google/Outlook Calendar, Twilio, RingCentral, Lightspeed Voice, Zoom, Google Meet, DocuSign, Dropbox Sign, plus Facebook, Instagram, X, LinkedIn, and Google Business Profile. Each card is bring-your-own (agency pays) with a **Connect stub** and **Not connected** / **Connected (stub)** badges. No live OAuth. No Zoho.

**Social pulse** (`/social` and the Home widget) shows demo followers / engagement / views after a connect stub. Seed connects Facebook, Instagram, and GBP. Instagram is Maya’s connected stub; Facebook and GBP are agency-level. **GBP policy:** Admin must toggle **Allow agents to monitor GBP** before agents see listing numbers or GBP inquiries. Inbound on an agent’s stub creates a **Lead + in-app alert** to that agent. Agency inbound stays unassigned until Admin **Awards** it. Management lead offers stay on Home; social inbound uses `social_lead_offers`.

Settings → Lines: hide Life or Health for agencies that do not write those books (pipeline switcher and filters follow). One Pipeline nav row — Life and Health stay as tabs on `/pipeline`. Life chips default to Term / Whole / IUL / Final Expense. Health chips default to Marketplace / Medicare Advantage / Medicare A&B / Supplemental. Selling Agency picklists stay off unless you turn them on in Settings.

Admins can tag a teammate on a Policy or any other record (**Ask a teammate**). The block is **Admin-only on every record** — hidden for agents on Contact, Deal (including Quote Sheet / Markets / Quotes tabs), Policy, Lead, Business, and Carrier. That writes the same `record_asks` row used on commissions, logs it on the record, and pings Alerts. Not a chat product. No email or SMS to the tagged person. Seeded: Javy asked Maya for status on `HO3-ELENA-2026`.

## Pipeline

- Personal-lines tab is **P&C pipeline** (slug stays `p-c`).
- **Won-Lost** and **Archive** are two tabs, not one combined “Won-Lost / ARCHIVE”.
- **Flood** is a normal board — no Admin badge, no Admin stage panel.
- Columns sit side-by-side. Each stage header has a small up/down arrow on the right to collapse or expand that column.
- **Edit stages** on any board: add, rename, remove, reorder.
- Drag a deal card onto another column to move it.
- Cards show **Call**, **SMS**, **Task**, and **Meeting**. Dial and Mail are gone. Meeting types: Video-call, In-Home, In-Office.
- In-Office uses the agency office plus the agent’s meeting address from Settings → Communications. In-Home pulls the Deal / Lead street. Video opens the Zoom / Meet / BYO stub saved there.
- **Ask a teammate** does not appear on pipeline cards (Admin-only on records).
- **Columns** picker chooses which deal details show on cards and the table. Title stays on.

## Scorecards + Glance

- **Scorecards** (`/scorecards`) — Admin ranks producers on conversion, retention, in-force premium, and binds. Agents see their own card and rank only. People / Agents opens the same scorecard. Quotes (Ana $321,000 HO3) are not binds and not premium.
- **Glance** (`/glance`) — Sales | Service | Claims | Renewals tabs filter existing Deals, service work, claims, and in-force renewals. One Pipeline stays on `/pipeline`.

## Top chrome (Batch 4)

Right of Smart Search on every AppShell page:

- **Smart Search** stays in the header with a stronger navy outline. Search is not a left-nav row.
- The top-left **page title matches the active module** (Home, Pipeline, Leads, Contacts, Deals, Policies, Documents, …). A record name can sit under it.
- **Refresh** reloads the current desk view.
- **Alerts** (bell) is the alerts module — in-app alerts plus dismiss. Alerts is not a left-nav row.
- **What’s New** is a short changelog of desk features (stub entries).
- **Recently accessed** shows the last contacts, deals, and policies (local visits, with a book stub fallback).
- **Quick actions** open Add Lead, Add Deal, Add Policy (bind stub), Add Task, and Add Meeting.
- **Support** opens the same “Coming soon — we'll wire this later.” stub as the left-nav Support row. Visible to Admin and Agent.
- **Profile** shows the Admin / Agent badge and a link to Profile settings (`/settings/my-desk`).

Do not restyle the blue/orange tokens. Sidebar stays forced light-blue `#c5ddf4` with near-black ink.

## Columns picker

On every datasheet (Leads, Deals, Contacts, Businesses, Policies, Carriers, Tasks, Reviews), the **Columns** control sits on the far right of the AppShell title row — same bar as the page title and Smart Search. It does not float over the table body.

## Address autofill

Street / mailing / premises / location fields use `AddressAutofill`. With `GOOGLE_MAPS_API_KEY` or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`, typing a street offers Google Places suggestions and fills city, state, ZIP, and county on the same form. Without a key the desk still loads; those fields are ordinary text inputs.

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead (person only) → Deal (source docs + shop) → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy. Dec / 4-point / wind mit drop lives on **Deals**, not Leads.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **Quote Sent**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
- **Ortega · Winter Garden HO3** — inland masonry shop for Markets auto-fits.
- **Rosa Keene** — open merge pair on email (do not merge Ana).
- Wave-1 book names when seeded: Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row. Communications write a durable log on the record. No Twilio, SendGrid, or live Zoho.

## BATCH3 quoting (ASAP test)

1. **Lead → Deal.** Open a Lead. Convert when ready. Source docs stay off the Lead.
2. **Deal drop.** On the Deal **Documents** tab: upload a dec / 4-point / wind mit (or a sample). Detect type from the filename. Pick **HO3 homeowners**. **Fill master sheet** parses those source docs into the HO3 Quote Sheet (blanks only; yellow missing / blue CHECK) and prepares empty Auto + GL + WC worksheets. Super-Copy / Chrome Fill read that sheet — never the raw PDFs. Corrections write the **Fill Feedback** log (`/quotes/fill-feedback`) and **Fill Learning** (`/logs/fill-learning`). Issued quote PDFs open in-browser with Email / SMS / Print stubs.
3. **Visual approve.** Quote Sheet tab: glance yellow/blue cells. Check **I visually reviewed this master sheet**, click **Approve and unlock quoting**, then confirm **Are you sure?**
4. **Handoff.** After unlock: **Copy sheet**, **Send to Fill**, or **Open Fill window**. Prefer the Chrome Fill add-on (`extensions/fill`). No per-agent bot. If the add-on is missing, copy/paste in the new window.
5. **Appetite log.** Quotes tab → quoted / declined / maybe. `maybe` does not change filter-first matching.
5b. **Compare.** Quotes tab → **Open interactive compare**. Tick quotes, read the yellow diffs and the plain-English note, generate a branded PDF proposal, or paste a record/upload video link onto the deal. No Loom. Elena already has a stub video URL. Ana stays unbound.
6. **Fill Learning.** On the Quote Sheet, **Mark mapping wrong** writes a correction (doc type + field + extracted → corrected). The next extract for that `doc_type` + `field_key` uses the latest safe agency-wide remap when the extracted string matches. Admin browse: `/logs/fill-learning` (sibling of Appetite / decline log). Seeded Elena HO rows: roof year, construction, roof covering. Ana Cov A stays **$321,000**.
7. **Ana lock.** `Dib · Palm Bay HO3` Cov A **$321,000**. Stay shopping. Do not bind.
8. **Admin-only.** Master risk + Markets/appetite stay Admin. Fill Learning browse is Admin. Ask a teammate on Deal is hidden for agents.
9. **Communications / Integrations.** Settings → Communications: email (Gmail/Workspace, Outlook/365, Yahoo), campaigns (Mailchimp, Constant Contact, SendGrid), calendar, phone/SMS (Twilio, RingCentral, Lightspeed Voice, Bandwidth optional), Zoom/Meet, DocuSign + Dropbox Sign. Plug-only. Agency pays. FitFirst does not subscribe to Twilio.

## Communication (this desk)

- **Ask a teammate** on Policy / Contact / Lead / Deal / Business / Carrier. Tag dropdown is required. The whole Ask block is Admin-only (hidden for agents) on every record. It never appears on pipeline cards. Seeded Javy → Maya on `HO3-ELENA-2026`. Writes a durable activity log + Alerts ping.
- **Contact / Business Timeline** auto-saves email, SMS, tasks, meetings, and calls done from the desk. No manual “log activity” form on those records.
- **Phone call log** (`/phone`) — duration + outcome, attached like platform auto-activity. Admin **Phone line** settings are a Twilio/BYO stub. No PSTN.
- **Calendar** — month / week / day, hourly slots, type colors, filter, edit, drag-drop reschedule. Admin **Company meeting / Training** with a video URL and invite Whole agency / Office / Territory / Management. Invited agents get an in-app alert plus the event.
- **Email templates + triggers** live under Settings as stubs. Nothing sends.
- **Integrations catalog** (`/settings/integrations`) — BYO providers (Gmail, Outlook, Yahoo, Mailchimp, Constant Contact, SendGrid, Google/Outlook Calendar, Twilio, RingCentral, Lightspeed Voice, Zoom, Meet, DocuSign, Dropbox Sign, Facebook, Instagram, X, LinkedIn, Google Business Profile). Connect stub only. Agency pays. No Zoho. No live OAuth.
- **Automations** is its own nav row (`/automations`) — not buried only in Settings. **Campaign sequences** (`/automations/sequences`) are the five insurance drips (lead nurture, quote follow-up, 60/30 renewal, cross-sell, review ask). Each step is a Task or work-email template stub; enable/disable only. Nothing sends. Email campaigns use the Mailchimp / Constant Contact / SendGrid stubs when connected; otherwise **Connect integration**. Bulk SMS is the same for Twilio / RingCentral / Lightspeed. Work-email templates read the existing library. Guided builder is Trigger → Condition → Action (prefer in-app notify). Agents draft signatures; Admin approves before live. Additive `0025_automations_hub` + `0036_campaign_sequences`.
- **Social / GBP** (`/settings/social`, `/social`) — connect stubs + pulse. Admin gate on GBP before agents monitor. Inquiries → Lead. No vendor spend. Additive `0026_social_gbp`.
- **Alerts** stay in-desk (asks + work-queue pings). The header bell owns alerts — Alerts is not a left-nav row.
- **Meetings** from a pipeline card: Video-call, In-Home, or In-Office. Settings → Communications stores Zoom / Meet / BYO stubs plus the agency office and each agent’s meeting address.

## Open API (`/api/v1`)

JSON list/get for contacts, policies, deals, and activities. CSV for contacts, policies, and commissions. Bearer tokens are hashed in `api_tokens` (`0036_api_tokens`). The desk session cookie also works. Agents only see their own book; Admin sees the tenant.

Seeded demo Admin token: `ff_demo_admin` (override with `DEMO_API_TOKEN`). Encrypted SSN / EIN / DL stay off the payload. Ana Dib stays shopping — contact with zero policies, no commission row.

Admin UI: **Settings → Brand / Agency → Export** (`/settings/export`).

```bash
# who am I
curl -s http://127.0.0.1:43147/api/v1/me \
  -H "Authorization: Bearer ff_demo_admin"

# lists (optional ?q= ?status= ?stage= ?kind= &limit= &offset=)
curl -s http://127.0.0.1:43147/api/v1/contacts?q=Elena \
  -H "Authorization: Bearer ff_demo_admin"
curl -s http://127.0.0.1:43147/api/v1/policies \
  -H "Authorization: Bearer ff_demo_admin"
curl -s http://127.0.0.1:43147/api/v1/deals?stage=quote_sent \
  -H "Authorization: Bearer ff_demo_admin"
curl -s http://127.0.0.1:43147/api/v1/activities?kind=task \
  -H "Authorization: Bearer ff_demo_admin"

# one record
curl -s http://127.0.0.1:43147/api/v1/contacts/<id> \
  -H "Authorization: Bearer ff_demo_admin"

# CSV
curl -s http://127.0.0.1:43147/api/v1/export/contacts.csv \
  -H "Authorization: Bearer ff_demo_admin" -o contacts.csv
curl -s http://127.0.0.1:43147/api/v1/export/policies.csv \
  -H "Authorization: Bearer ff_demo_admin" -o policies.csv
curl -s http://127.0.0.1:43147/api/v1/export/commissions.csv \
  -H "Authorization: Bearer ff_demo_admin" -o commissions.csv

# issue another Admin bearer (local desk)
curl -s -X POST http://127.0.0.1:43147/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"javy@fitfirst.local"}'
```

`GET /api/v1` returns the catalog. 401 is `{ "error": "unauthorized" }`. Missing id is `{ "error": "not_found" }`.

## Tests

```bash
npm test
```

## Known leftovers

- Left nav **Documents** (was Forms). Page title Documents. Two areas: Forms + Library. Nested folders, multi-file upload, fillable Scan & suggest stub. `/forms` redirects into Documents → Forms.
- `tsc` still drifts (asks.updatedAt, contact tags, quote-sheet `photo-ocr` source, email template field names). `npm run build` is green because Next skips that leftover (`typescript.ignoreBuildErrors`). Desk routes compile under Turbopack.
- `/phone` is a call log + trunk stub. No PSTN. Google Calendar stays a stub.
- Address autofill needs `GOOGLE_MAPS_API_KEY`; without it the fields are ordinary inputs.
- Search is substring, so `Ana` also lists Camila.
- Camila Auto `QBE-PA-66103` still has an empty vehicle schedule (Soto `FF-PA-4401` is the 2/2 seed).
- Policy renewal compare stays the thin reader (ComparePanel not reattached). Deal Quotes comparison has English “why this quote” copy. Interactive compare is live at `/deals/[id]/compare` (rule-text gaps, not LLM).

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
