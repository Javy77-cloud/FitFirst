# FitFirst owner-desk platform audit

**Date:** 2026-09-24
**Scope:** Read-only comparison of this Next.js + Neon desk to the locked product design. No product code was changed.
**Live desk:** https://fit-first-seven.vercel.app

Routes walked: `/` (owner desk), `/deals`, `/deals/[id]` (Risk Profile, Markets, Quotes, header stage), `/quotes`, `/policies`, `/renewals`, `/notifications`, `/developer/healthsherpa`, `/settings/developer-hub/api-vault`, plus server actions under `src/app/actions/` and schema in `src/lib/db/schema.ts`.

---

## Executive summary

- **Quote sent / Bound / Outside are not send-gated.** The header stepper and the outside-FitFirst dialog advance those stages from a selected quote id or a free-text reason. Nothing checks that a client email, SMS, or proposal was actually sent. The action that maps quote status `sent_to_client` → pipeline `quote_sent` is never called from the UI.
- **Ana Dib can be bound.** Macros, mass update, list selection, and outbound templates skip her fixture ids. Policy mint (`issuePolicyFromDeclaration`) does not. Deal copy says “do not bind”; the mint path will still issue a policy if a declaration is present.
- **Session cookies are unsigned, and demo passwords still work after a real hash is stored.** Proxy admin gates trust the `ff_role` cookie. `passwordMatchesUser` falls through to hardcoded `javy` / `javier` / `logan` / `maya` passwords. Several mutating actions never load the session.
- **A dead quote can red-out that carrier for the whole book.** Marking a quote lost writes a `declined` attempt with empty risk snaps and line `HO`. Request Quotes loads every tenant attempt as “prior.” A null snapshot matches every risk, and a learned decline is a hard fail (red), so the appetite pass will not shop that carrier again.
- **Flood “skip Southern Oak and Olympus” is only on the Markets matcher.** `writersForDealLine` drops them when Neptune / Selective / Tower Hill / Wright are in the rule set, and seed strips `FLOOD` from their written lines. `shopDealQuotes` (Request Quotes) does not use that filter.
- **Agency day math is split.** Display clock is Eastern (`src/lib/time/et.ts`). Renewal day counts, home month KPIs, and several policy date writers still use UTC / `toISOString().slice(0, 10)`. After 8pm ET a renewal can change band.
- **Request Quotes does not invent premiums, and every carrier portal is `EmptyPortalAdapter`.** It writes `quoteAttemptLogs` only (`result: "maybe"`, `bindable: false`). Quote rows are created by manual desk actions.
- **HealthSherpa, Gemini DEC, FL chips (HO3 / Flood / MHO), life/health override, and renewal 30/60/90 are built**, with the gaps called out below. Per-market quote cutoffs are not built. Notifications are single-writer for cold-chase only.

---

## P0 Critical bugs

### 1. Quote sent, Selected, and Outside advance with no client send

**Severity:** P0 — stage and policy truth can be wrong.

**Evidence:**

- Locked stages live in `LATE_PRODUCT_STAGES` (`quote_sent`, `bound`, `policy_issued`, `closed_won`) in `src/lib/deals/product-stages.ts`. The gate is “a live selected quote id, or an outside override,” not a send. `lateStageNeedsQuoteSelection` returns false when `outsideOverride` is set (`src/lib/deals/product-stages.ts`).
- `setDealProductStage` (`src/app/actions/product-stage.ts`, route surface `/deals/[id]`) accepts `surface: "quotes" | "header" | "chip"`. From the Quotes tab, `quotesOnlyStageBlocked` is false (`src/lib/policy/mint-gate.ts`), so Quote sent commits as soon as a quote id is picked. `DealHeaderStage.commit` (`src/components/deals/deal-header-stage.tsx`) calls that action directly.
- Outside path: `overrideDealProductStageOutside` builds an override from a reason string (`src/lib/deals/outside-stage-override.ts`, dialog `src/components/deals/outside-stage-override-dialog.tsx`). Allowed targets include `quote_sent`, `bound`, `policy_issued`, `closed_won`. No outbound message is required. Policy issued with an outside override skips mint and only stamps the stage; a later DEC upload can still mint.
- The status that *sounds* like a send is unwired. `pipelineSlugForAgentStatus("sent_to_client")` returns `"quote_sent"` (`src/lib/quotes/outcomes.ts`). `saveQuoteAgentStatusAction` (`src/app/actions/quotes.ts`) is the only caller of that map, and no component imports it. There is no `sent_to_client` control in `src/components/`.
- Quotes and policies are separate tables, which matches “a quote row is not a policy.” Moving the product to Policy issued with a selected quote calls `issuePolicyFromDeclaration` in the same action. A declaration file plus a stage click creates a policy without a client send.

**Impact:** The board can show Quote sent, Bound, or Policy issued, and `/policies` can gain a row, when the client was never sent the quote. Renewals, 30/60/90 tasks, and owner-desk “quote sent” counts (`src/lib/home/aggregate.ts`) follow that stamp.

---

### 2. Ana Dib is not blocked on the bind / mint path

**Severity:** P0 — fixture data integrity. Lock: Ana stays unbound, Coverage A $321,000.

**Evidence:**

- Fixture ids: lead `22222222-2222-4222-8222-222222222221`, deal `…222`, risk `…223`, contact `…224` (`src/lib/fixtures/ids.ts`). `isProtectedAnaRecord` (`src/lib/developer-hub/protected.ts`) is used by macros (`src/lib/developer-hub/run-macro.ts`), mass update (`src/app/actions/mass-update.ts`), and list selection (`src/app/actions/list-selection.ts`). Outbound templates also skip the contact (`src/lib/templates/send.ts`, `isProtectedAnaContact`).
- `src/app/actions/policy-mint.ts` and `setDealProductStage` do not reference those ids. Grep of the mint file finds no Ana guard.
- UI copy on `/deals/[id]` and `/deals/[id]/compare`, plus `/glance`, states she stays shopping / unbound at $321,000. That is copy and tests (`src/lib/quoting/ready-to-shop.ts`, `src/lib/quotes/explain.ts`), not a write barrier.
- Coverage A $321,000 is enforced in sheet/seed tests and Southern Oak is unrelated. Nothing stops an agent from confirming a DEC and landing her on `/policies/[id]`.

**Impact:** One Policy issued click on the Ana deal, with any declaration in the quote folder, creates a real policy and can schedule 30/60/90 work. Seed re-runs may not undo a live policy row.

---

### 3. Unsigned session cookies and a demo-password backdoor

**Severity:** P0 — anyone who can set cookies, or who knows the demo emails, can act as a desk user. No RLS underneath.

**Evidence:**

- Cookie names only, no signature: `ff_actor_id`, `ff_role`, `ff_mfa` (`src/lib/auth/cookies.ts`). `httpOnly` + `sameSite: lax`. No `secure` flag in `SESSION_COOKIE_OPTS`.
- Edge gate `src/proxy.ts` (matcher covers the app) treats `ff_role === "admin" | "owner"` as admin and `ff_actor_id` as the session. It does not re-read the user row. A forged `ff_role=admin` plus any active user id passes `/settings/*` admin paths.
- `currentDeskSession` (`src/lib/auth/session.ts`) does load the user by `ff_actor_id` and takes the role from the database. Pages that call it are safer than the proxy. Actions that never call it are not. `shopDealQuotes`, `setDealProductStage`, `saveQuoteAgentStatusAction`, and `deleteSelectedQuotesAction` mutate deals with no session check. `overrideDealProductStageOutside` reads the session for the activity line and does not reject a guest.
- `passwordMatchesUser` verifies `passwordHash` and, on failure, still calls `checkDemoPassword`. Demo map: `javy@fitfirst.local` / `javy`, `javier@fitfirst.local` / `javier`, `logan@fitfirst.local` / `logan`, and `maya@fitfirst.local` / `maya` (`src/lib/auth/session.ts`). A stored hash does not disable those passwords.
- Schema (`src/lib/db/schema.ts`) has no row-level security. Isolation is `DEFAULT_TENANT_ID` in application queries, and many reads are `where eq(deals.id, dealId)` with no tenant predicate (`shopDealQuotes`, `syncDealPipelineFromQuoteStatus`).

**Impact:** On the live Vercel app, a demo login or a crafted cookie can read and write the book (quotes, stages, policies, HealthSherpa review). There is one tenant, so a stolen agent id is the whole agency.

---

### 4. One lost quote can mark a carrier red on every other deal

**Severity:** P0 — Markets filter and Request Quotes burn the wrong carriers. Data on `quote_attempt_logs` is book-wide.

**Evidence:**

- `shopDealQuotes` (`src/app/actions/quotes.ts`) loads **all** tenant `quoteAttemptLogs`, then:

  ```ts
  const prior = logs.filter((log) => isMatchPriorResult(log.result))
  ```

  It does not filter `dealId`. `isMatchPriorResult` is true for `quoted | declined | floor_only | takeout_only | portal_closed` (`src/lib/domain.ts`). `maybe` is correctly excluded.
- `matchCarrier` (`src/lib/appetite/match.ts`) treats a non-bindable prior with `similarSnapshot` as `learned_decline` severity `fail`. Any fail forces band `red`. The appetite pass only shops `band === "green"`.
- `similarSnapshot` returns true for a field when the log snap **or** the risk value is null. Year and roof also match within one year.
- `saveQuoteReasonForNoAction` and the dead branch of `saveQuoteAgentStatusAction` insert `result: "declined"`, `bindable: false`, **`lineOfBusiness: "HO"` hardcoded**, and **no snap columns** (`src/app/actions/quotes.ts`). Those rows match every later risk.
- `saveQuoteAgentStatusAction` is unwired, but `saveQuoteReasonForNoAction` is a real server action. Any caller (or a future Quotes control) poisons appetite immediately. Historical `declined` logs with empty snaps already do.

**Impact:** A carrier that declined one file, or that was marked lost, disappears from green Markets and from Request Quotes on unrelated homes. Filter-first then shops a distorted list. The `HO` hardcode also teaches flood and auto declines as homeowners.

---

## P1 Design mismatches

### 5. Flood shop skip of Southern Oak and Olympus is not on the burn path

**Severity:** P1 — Markets and Request Quotes disagree.

**Evidence:**

- Lock is implemented for the **Markets matcher**. `writersForDealLine` (`src/lib/appetite/shop-fits.ts`) keeps only first-wave flood writers when any of them exist. First wave is Neptune, Selective, Tower Hill, Wright (`FIRST_WAVE_FLOOD` in `src/lib/appetite/first-wave.ts`). Test in `src/lib/appetite/shop-fits.test.ts` expects Southern Oak and Olympus absent when those four are present.
- If **no** first-wave flood writer is in the rule set, the function returns every flood writer, including Southern Oak and Olympus.
- Seed strips the line: `written.delete("FLOOD")` in `src/lib/db/seed-southern-oak.ts`, and the same comment for Olympus in `src/lib/db/seed-javy-bulletins.ts`. That only helps after seed. Stale Neon `written_lines` still containing `FLOOD` are what the burn path reads.
- `shopDealQuotes` filters with `writesDealLine(carrier.writtenLines, lob)` and `rankFits`. It never calls `writersForDealLine` or `matchFloodShopCarriers` (`src/lib/appetite/javy-flood-shop-list.ts`). Manual ids are added even when the band is not green (shop-list ids that are already green are skipped; other manual ids are added).

**Impact:** The Flood Markets panel can hide Southern Oak and Olympus while Request Quotes still opens an attempt log for them, or the reverse if first-wave rows are missing and written lines were not stripped.

---

### 6. Named insured is not forced to First Last

**Severity:** P1 — DEC fill and contact create can store a bad legal name.

**Evidence:**

- `splitNamedInsured` (`src/lib/quote-sheet/apply.ts`) splits on spaces. One token is copied into **both** first and last (`"Ana"` → first Ana, last Ana). The last token is always the surname, so `"Robert De Swartz Junior"` becomes last name `Junior` (fixture used in `src/lib/desk/policy-information.test.ts`). `"Last, First"` is not parsed.
- `primaryApplicantDisplayName` (`src/lib/deals/deal-display-name.ts`) only strips a `·` co-applicant and a duplicated `"Rosa Castellanos ROSA CASTELLANOS"` pair. It does not reorder Last, First.
- `fillContactBlanksFromSheet` writes that split onto the contact when the name looks like a placeholder. Mint confirm label is “Named insured” (`src/lib/policy/mint-gate.ts`) and Gemini is told to copy the printed name (`src/lib/extraction/gemini/prompt.ts`). There is no First Last normalizer on the way into `contacts.first_name` / `last_name` or `deals.primary_named_insured`.

**Impact:** Policies, proposals, and HealthSherpa contact sync can show “Junior” as the surname or a doubled single name. The lock is a display and storage rule, not just a DEC prompt.

---

### 7. Eastern desk clock is not the day bucket

**Severity:** P1 — renewal 30/60/90 and “this month” KPIs slip a day after 8pm ET (7pm EST).

**Evidence:**

- Correct helper: `etDateKey` / `etTodayDateKey` in `src/lib/time/et.ts`. Comment: never `toISOString().slice`. Display uses it via `src/lib/desk/desk-timezone.ts`. Task due parsing tests in `src/lib/tasks/due-at.test.ts` do use ET wall time.
- Renewal bands do not. `daysUntilExpiration` (`src/lib/ams/renewals.ts`) diffs **UTC** calendar dates of `deskNow()` (`new Date()` in `src/lib/home/as-of.ts`). Bands are `under30` / `30to60` / `60to90` / `90plus` (`src/lib/renewal/urgency.ts`). A policy that expires “tomorrow” ET can sit in Under 30, or look overdue, between 8pm and midnight ET.
- Owner-desk month math is UTC: `startOfUtcMonth`, `sameUtcMonth`, `isoDate` → `toISOString().slice(0, 10)` (`src/lib/home/as-of.ts`), used by `src/lib/home/kpis.ts`, `src/lib/home/aggregate.ts`, `src/lib/home/birthdays.ts`, `src/lib/home/attention-window.ts`.
- Policy term roll (`src/lib/policy/advance-current-term.ts` `asNoonUtc`) and mint date normalize (`normalizeMintValue` in `src/lib/policy/mint-gate.ts`) parse arbitrary date strings with `toISOString().slice(0, 10)`. A Gemini date that `Date` reads as US local midnight can store the previous UTC day. Same pattern on policy forms (`src/components/policy/policy-inline-fields.tsx`, `correct-term-dates-dialog.tsx`) and renewal cross-sell (`src/components/renewals/cross-sell-panel.tsx`).

**Impact:** `/renewals` urgency, Client staying’s 90-day window (`CLIENT_STAYING_WINDOW_DAYS` in `src/lib/renewal/handled.ts` still keys off `renewalDate`), and home “written this month” disagree with the ET clock on the desk header.

---

### 8. Notifications are not a single writer

**Severity:** P1 — duplicate bells and races. Cold-chase was fixed; everything else was not.

**Evidence:**

- Intended pattern, cold-chase only: `panelOwnsInsert` refuses `deal_cold_chase` inserts inside `syncPanelSignals` (`src/lib/notifications/sync-panel.ts`). Comment: AppShell and `/deals` both scheduled writers and doubled Petersen/Palacios/Hamilton. Canonical writer is `syncDealColdChaseNotices`, wrapped in `coalesceAsync`.
- Other kinds insert `alerts` directly, with no shared writer: `src/app/actions/alerts.ts`, `pipeline.ts`, `policy-mint.ts`, `crm.ts`, `documents.ts`, `inbox.ts`, `renewals-board.ts`, `ams.ts`, `claims.ts`, `automations.ts`, `people.ts`, `owners.ts`, `deal-desk.ts`, `home-dashboard.ts`, `list-bulk.ts`, `mass-update.ts`, `record-asks.ts`, `activities-desk.ts`, `click-to-call.ts`, `company-meetings.ts`, plus `src/lib/work-queue/service.ts`, `src/lib/developer-hub/store.ts`, `src/lib/portal/requests.ts`, `src/lib/deals/cold-chase-sync.ts`, `src/lib/leads/offers.ts`.
- `/notifications` reads that table. Panel sync collapses duplicate keys only for `PANEL_SIGNAL_KINDS`.

**Impact:** The same event can create two unread rows. Dismiss on one leaves the other. This is the failure mode the cold-chase comment already describes.

---

### 9. Request Quotes result `maybe` looks like a market outcome

**Severity:** P1 — behavior matches “do not invent premiums,” but the log result is easy to misread.

**Evidence:**

- `portalFor` always returns `new EmptyPortalAdapter` (`src/lib/appetite/portals.ts`). `submitQuote` returns `status: "not_implemented"` and does not log in.
- `shopDealQuotes` still inserts `quoteAttemptLogs` with `result: "maybe"`, `bindable: false`, and no `premium`. The `why` text includes the adapter message and “no stub premium.” It does **not** insert `quotes`. That part of the lock holds. Quote rows are manual: `recordManualQuote` (around the insert at `src/app/actions/quotes.ts`) and `saveLifeHealthQuoteResultAction`.
- `maybe` is an appetite-capture value, not a `QUOTE_RESULTS` value, so it does not feed `learned_decline`. It does show up on Markets / attempt history as a shop result. `FF_BLOCK_CARRIER_LOGIN_ISSUES` defaults off; the comment says login failures must not skip production markets until the flag is `1`.

**Impact:** Agents can treat a stub portal ping as “we quoted, maybe.” No dollar amount is invented. The burn still happens (log row per green carrier) even though no portal ran.

---

### 10. Life/health override is the P&C outside dialog, and dead-quote status never reaches the pipeline

**Severity:** P1 — override exists, but not as a life/health-specific send-gated control. Quote workflow statuses are dead code.

**Evidence:**

- FL chips are implemented. `productChipLabel` (`src/lib/deals/product-stages.ts`, used on `/deals/[id]`): homeowners → HO3, flood → Flood, landlord HO3 → DP3, auto → Auto. `MMHO` / `MH` canonicalize to `MHO` (`src/lib/quoting/forms.ts`, `src/lib/documents/doc-slot-advance.ts`). Chips render in `src/components/deals/deal-product-stage-chips.tsx` on the deals list.
- Life/health do not use the P&C market filter. `marketsUseSheet = !isLifeHealthShopLine(sheetLine)` on `src/app/deals/[id]/page.tsx`. `LifeHealthPanel` (`src/components/crm/life-health-panel.tsx`) says there is no rating worksheet or portal. `LifeHealthQuotesPanel` (`src/components/deal/life-health-quotes-panel.tsx`) is a manual writer (premium and face amount typed by the agent) plus Issue-from-DEC. `saveLifeHealthQuoteResultAction` writes a real `quotes` row and auto-advances to `quote_review` with no send check.
- The override button is `OutsideStageOverrideDialog`, shared with P&C, on the header stepper and the quotes panel. It is not limited to life/health, and it is not tied to a client send (see P0 #1).
- Agent statuses Quoted / Sent / Review / Bound / Won / Lost (`AGENT_STATUS_LABELS` in `src/lib/quotes/outcomes.ts`) have no UI. Pipeline movement from “Sent” cannot happen through the product path the tests describe.

**Impact:** Life and health can be forced to Quote sent or Bound with a sentence of reason, same as HO3. The Quotes-tab status vocabulary the design describes is not on the page.

---

### 11. Deleting a quote leaves it selected

**Severity:** P1 — stage gate and mint can follow a deleted id until the next parse against live ids.

**Evidence:** `deleteSelectedQuotesAction` (`src/app/actions/quotes.ts`) deletes `quotes` rows and revalidates `/deals/[id]`. It does not update `shopFlow.productStages.selectedQuoteIds`. Display helpers that pass live quote ids hide the stamp (`stageWithoutLeftoverQuoteSent`). Paths that trust the stored id list still see the old selection.

**Impact:** Quote sent can look selected with no row, or a later mint/bind can target an id that no longer exists.

---

## P2 Missing pieces

### 12. No per-market cutoff. Florida 5pm is not hardcoded — the feature is absent

**Severity:** P2 — lock says cutoffs are configurable per market, desk clock stays ET.

**Evidence:** Desk “as of” on `/` uses the ET display clock (`src/components/home/owner-desk.tsx`, `src/lib/home/as-of.ts` `deskNow`). Search of `src/` finds no carrier or market `cutoff`, `closeHour`, or 5:00pm shop window. `17:00` hits are seed timestamps and calendar tests, not a Florida cutoff constant.

**Impact:** Nothing warns or blocks a shop after a carrier’s same-day deadline. Making it configurable later is greenfield, not a change to a hardcoded 5pm.

---

### 13. Renewal 30/60/90 bands exist; outcomes and delivery are only partly extended

**Severity:** P2 — do not rebuild the bands. Extend outcomes and the send path.

**Evidence (built):**

- Bands and heat: `src/lib/renewal/urgency.ts`. Board: `/renewals` via `src/lib/renewal/board-data.ts` and `src/app/renewals/page.tsx`. Queue: `/renewals/queue`.
- Composite risk is on the board (`scoreRenewalRisk` in `src/lib/renewal/board-enrich.ts`). `stubRenewalRisk` in `urgency.ts` is leftover; the board does not call it. `riskScore` is filled in enrich, not left at 0.
- Client staying is gated to 90 days before `renewalDate` (`src/lib/renewal/handled.ts`). Won/Lost stages are `bound` and `lost` (`src/lib/renewal/board-filter.ts`).
- Bind still plans 30/60/90 review tasks (`src/lib/crm/bind.ts`). `/reviews` copy points at those tasks.

**Evidence (not built / stub):**

- Day math is UTC (P1 #7), so the bands are real but the clock is wrong at night.
- Cross-sell email is a desk stub: “nothing sends until a vendor is wired” (`src/components/renewals/cross-sell-panel.tsx`).
- No outcome for “remarketed,” “non-renewed by carrier,” or “rewrite to a new policy id” beyond bound/lost and client-staying. Autopilot queues an internal mark (`src/lib/renewal/autopilot.ts`) and does not send.
- Renewal compare can fill from Gemini DEC (`src/lib/renewal/fill-compare-from-decs.ts`) and refuses to invent premium. The drawer says so when the key is missing (`src/components/renewals/renewal-compare-drawer.tsx`).

**Impact:** The 30/60/90 board is the right base. Outcome extension and a real client touch are still open. Rebuilding the bands would duplicate this.

---

### 14. HealthSherpa is integrated, but ACA does not rate inside the desk and keys fail closed

**Severity:** P2 — present, not a stub, easy to think it is live when the vault is empty.

**Evidence:**

- Routes: `/developer/healthsherpa` (review queue, `src/components/healthsherpa/review-queue.tsx`), contact review `/contacts/healthsherpa-review`, vault status on `/settings/developer-hub/api-vault` and on `/deals/[id]`.
- Medicare: `src/lib/healthsherpa/client.ts`, bulk sync `src/lib/healthsherpa/bulk-medicare.ts`, contact sync `src/lib/healthsherpa/sync.ts`. Inbound webhook creates/updates contacts and policies (`src/lib/healthsherpa/inbound.ts`, `upsertHealthSherpaPolicy`). Review enrollments stay in a queue until `resolveHealthSherpaEnrollment`.
- ACA: `healthSherpaAcaStatus` (`src/lib/healthsherpa/aca.ts`) states FitFirst does not quote ACA inside the desk. QuoteConnect runs only with a partner key, ZIP, and applicant age, and opens HealthSherpa Marketplace.
- Sheet field `using_healthsherpa` is a yes/no on the health risk profile (`src/lib/quote-sheet/catalog.ts`). Empty vault copy: “No sync ran.”

**Impact:** Without vault keys, deal HealthSherpa chips show not configured. With keys, Medicare and inbound can create policies. Those policies are not send-gated and are not Ana-aware. ACA premium never lands on a FitFirst quote row by itself.

---

### 15. Gemini DEC read/fill is real and fails closed; date and name normalization are not

**Severity:** P2 — the integration exists. The holes are the date bucket (P1 #7) and named insured (P1 #6), plus key setup.

**Evidence:**

- Client meters `noteDeveloperApiCall("gemini")` (`src/lib/extraction/gemini/client.ts`). Key: `GEMINI_API_KEY` or developer vault (`src/lib/extraction/gemini/key.ts`). Prompt forbids inventing premium, dates, VIN, or carrier (`src/lib/extraction/gemini/prompt.ts`).
- Mint gate (`evaluateMintGate` in `src/lib/policy/mint-gate.ts`) requires a declaration in the quote folder (or, for outside override, on the deal). Missing policy number, premium, or effective date returns `need_dec_fields` and keeps the file. Home vs auto confirm fields differ (no Coverage A on auto).
- Renewal compare uses the same extract (`src/lib/renewal/gemini-diff.ts`, `fill-compare-from-decs.ts`).
- `/policies/new` tells the agent to confirm Gemini fields. There is no second reader if the key is missing; the toast is `gemini-needs-key`.

**Impact:** A missing key blocks fill rather than inventing a premium. A parsed date can still shift a day, and the named insured string is not forced to First Last before it hits the contact.

---

### 16. Filter-first Markets is a second code path from Request Quotes

**Severity:** P2 — the idea is on the Markets panel; the burn does not call it.

**Evidence:**

- Markets: `evaluateShopFits` → `writersForDealLine` + `rankFitsByFirstWave` (`src/lib/appetite/shop-fits.ts`). Red band is skip. Copy on the layout title and `src/lib/quoting/ready-to-shop.ts` says Markets stay filter-first.
- Request Quotes: `shopDealQuotes` re-ranks with `rankFits` / `matchCarrier` and shops greens plus manual ids. It requires the line sheet to be quoting-unlocked (`quotingUnlockedForLine`); otherwise it throws “Approve the Risk Profile before shopping markets.”
- Quote gate skip-decline is applied (`runAndPersistQuoteGate`). Login-issue blocking is off unless `FF_BLOCK_CARRIER_LOGIN_ISSUES=1`.
- Stretch pass shops yellows that do not already have a `quotes` row. It still does not create premiums.

**Impact:** An agent can believe the Flood or Home list on screen is the list that will be attempted. P0 #4 and P1 #5 are the concrete ways those lists diverge.

---

### 17. Authz inside the tenant is “any signed-in user, any record”

**Severity:** P2 — related to P0 #3, called out separately because even a legitimate agent session is unscoped.

**Evidence:** Home renewal-risk load passes `ownerId` for non-admins (`src/app/page.tsx`). Deal mutations do not. `shopDealQuotes(dealId)` and `setDealProductStage({ dealId })` take the id from the client. Agent Policy Access (`/settings/agent-policy-access`) is a settings page, not a check inside those actions.

**Impact:** Javier’s session can stage, shop, and mint Elena’s or Ana’s deal if the id is known. Ids are in URLs.

---

## P3 Nice-to-have observations

- **HO3 companion sheets.** `companionLines("HO3")` prepares Auto, GL, and workers comp (`src/lib/quoting/forms.ts`). A home shop can sprout worksheets the agent did not ask for.
- **`stubRenewalRisk` is dead on the board** but still exported. Easy to wire the wrong score later.
- **Phone, social, and several settings surfaces are stubs** and look like product: `/phone` (`DialerStub`), social BYO cards (`src/lib/social/byo.ts` “nothing posts”), Developer Hub API and connections (`src/app/settings/developer-hub/api/page.tsx`, `connections/page.tsx`), `/onboarding/purchase` (“not linked from the sidebar”), COI/ID portal pages described as stubs (`/portal/[token]`).
- **MFA demo bypass** is a user flag `mfaDemoBypass` honored in `sessionFromUser`. Combined with demo passwords this is a softer door than P0 #3, still worth removing on the live book.
- **`isoDate` and many `toISOString().slice(0, 10)` displays** (claims FNOL default, FedEx “today,” compliance log, carrier AM Best date) will drift after 8pm ET even when the underlying instant is correct. Prefer `etDateKey` when the value is “the agency’s day.”
- **Quote attempt `why` strings are doing too much work** (manual marker, shop-list marker, portal message). A structured column would stop Markets from parsing English to decide who is on the list (`marketCarriersForManualQuote`).
- **Single-tenant `DEFAULT_TENANT_ID`** is consistent. There is no second-agency story and no RLS to add one later without a pass over every query.
- **Owner desk Ana card** (`src/components/home/owner-desk.tsx`) links to `/deals?stage=quote_sent`. That is the right story only while nobody mints her (P0 #2).

---

## What already matches the locks

| Lock | Where it holds |
| --- | --- |
| Quotes are not policy rows | `quotes` vs `policies`. Mint needs a declaration (`evaluateMintGate`). Request Quotes does not insert `quotes`. |
| Request Quotes does not invent premium | `shopDealQuotes` insert has no `premium`. Comment: “Live desk: do not invent stub premiums.” |
| Carrier portals may be empty adapters | `portalFor` is only `EmptyPortalAdapter`. |
| Ana copy and Cov A $321,000 | Deal, glance, explain, ready-to-shop, and tests. Seed/sheet value `321000`. |
| Flood first-wave list | Markets matcher + “Load my Flood list” (`javy-flood-shop-list.ts`). Seed strips FLOOD off Southern Oak and Olympus. |
| ET display clock | `src/lib/time/et.ts`, desk header, task due parser. |
| Cold-chase single writer | `sync-panel.ts` `panelOwnsInsert` + `syncDealColdChaseNotices`. |
| FL chips HO3 / Flood / MHO | `productChipLabel`, `canonicalQuotingForm`. |
| Life/health manual quotes | `LifeHealthQuotesPanel` + `saveLifeHealthQuoteResultAction`. No fake P&C rate. |
| HealthSherpa review before book write | `/developer/healthsherpa`, `resolveHealthSherpaEnrollment`. |
| Gemini does not invent | Prompt + mint `need_dec_fields`. Renewal compare fails loud without premium. |
| Renewal 30/60/90 | `renewalUrgencyBand`, `/renewals`, bind task plan. |

---

## Suggested verification on https://fit-first-seven.vercel.app

No credentials are assumed. Do these only in a session you already have. Do not bind Ana.

1. **Send gate.** Open a non-Ana deal → Quotes. Select a quote and set the product stage to Quote sent. Confirm no email/SMS composer ran. Reload `/deals?stage=quote_sent` and the deal header. Expectation from code: the stage sticks with no send record.
2. **Outside.** On the same deal, use the outside override (header stepper, “Confirm override”) to Bound with a one-line reason and zero quote rows. Expect a stamp and no new `policies` row until a DEC is uploaded.
3. **Ana.** Open the Ana Dib HO3 deal from Home (“Ana Dib shop”) or search. Confirm Coverage A reads $321,000 and the stage is shopping / quote sent, not a policy. Do not use Policy issued. Check `/policies` search for her name and expect no in-force row.
4. **Flood list vs burn.** On a flood deal, open Markets. Southern Oak and Olympus should be absent when Neptune, Selective, Tower Hill, and Wright are on the list. Then Request Quotes and read attempt history. Code risk: a log can exist for a carrier the panel hid, if `written_lines` still contains FLOOD.
5. **Dead quote bleed.** On a test deal only, mark a quote lost (if the control is visible; the server action exists even if the button does not). Re-open Markets on a **different** similar home. Code risk: that carrier is red everywhere.
6. **Evening bands.** After 8pm ET, compare `/renewals` “Under 30” to the expiration date printed on `/policies/[id]`. A policy expiring the next ET morning can look due today.
7. **HealthSherpa.** `/developer/healthsherpa` and the deal health panel. With no vault key, expect “not configured” and an empty review queue, not a premium.
8. **Gemini.** On a deal with no `GEMINI_API_KEY`, start Issue from DEC. Expect a missing-key or extract-failed toast, and no policy row with a made-up premium.
9. **Chips.** Deals list should show HO3, Flood, and MHO (manufactured) chips with their own stage, not one shared stage.
10. **Life/health override.** Open a term-life or health deal. Markets should not be the P&C filter. Override / outside control should still be on the header. Saving a quote writer result should land on Quote review without sending the client anything.
11. **Login surface.** `/login` should not advertise the demo passwords. If those emails accept `javy` / `javier` / `logan`, finding 3 is live. This audit did not sign in.
