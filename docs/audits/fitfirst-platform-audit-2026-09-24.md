# FitFirst owner-desk platform audit

**Date:** 2026-09-24
**Scope:** Read-only comparison of this Next.js + Neon desk to the locked product design. No product code was changed.
**Live desk:** https://fit-first-seven.vercel.app
**Design sources used to sharpen this pass:** Captain handoff pack (2026-09-24 ~1:30pm ET, including Appendix C) and the running changelog standing decisions `D-2026-09-24-01` through `D-2026-09-24-04`. Those files are handoff context, not repo code. Where the pack said a fix was still in flight, `origin/main` has since landed `#367` (deal-only activity link + ET datetime round-trip).

Routes walked: `/` (owner desk), `/deals`, `/deals/[id]` (Risk Profile, Markets, Quotes, header stage), `/quotes`, `/policies`, `/renewals`, `/notifications`, `/developer/healthsherpa`, `/settings/developer-hub/api-vault`, plus server actions under `src/app/actions/` and schema in `src/lib/db/schema.ts`.

---

## Executive summary

- **Quote sent / Selected / Outside are not send-gated.** This is the Rosa rollback from 2026-09-24: those stamps moved with no client email. The header stepper and the outside-FitFirst dialog (`#345`) still advance them from a selected quote id or a free-text reason. “Selected” is not its own stage slug; it is `selectedQuoteIds`. The action that maps `sent_to_client` → `quote_sent` is never called from the UI.
- **Ana Dib can be bound.** Macros, mass update, list selection, and outbound templates skip her fixture ids. Policy mint (`issuePolicyFromDeclaration`) does not. Deal copy says “do not bind”; the mint path will still issue a policy if a declaration is present.
- **Session cookies are unsigned, and demo passwords still work after a real hash is stored.** Proxy admin gates trust the `ff_role` cookie. `passwordMatchesUser` falls through to hardcoded `javy` / `javier` / `logan` / `maya` passwords. Several mutating actions never load the session.
- **A dead quote can red-out that carrier for the whole book.** Marking a quote lost writes a `declined` attempt with empty risk snaps and line `HO`. Request Quotes loads every tenant attempt as “prior.” A null snapshot matches every risk, and a learned decline is a hard fail (red), so the appetite pass will not shop that carrier again.
- **Flood skip of Southern Oak and Olympus is a data migration plus the Markets matcher, not the burn path.** `drizzle/0152_strip_false_flood_writers.sql` strips `FLOOD` by carrier id and name. `shopDealQuotes` never checks those names, and the first-wave filter falls back to every flood writer when Neptune / Selective / Tower Hill / Wright are absent.
- **M1 “Current term is law” is not done.** Display clock is Eastern. Days-left on the policy care strip and renewal bands still use UTC or raw millisecond diffs. Gemini does not rewrite DEC `LAST FIRST` into First Last. Two different name splitters disagree. Renewal Fill Compare writes year built, roof, and construction onto the risk when those cells are blank, which the lock says it does not own.
- **Request Quotes does not invent premiums, and every carrier portal is `EmptyPortalAdapter`.** It writes `quoteAttemptLogs` only (`result: "maybe"`, `bindable: false`). Quote rows are created by manual desk actions.
- **HealthSherpa, Gemini DEC, FL chips (HO3 / Flood / MHO), life/health override, and renewal 30/60/90 are built**, with the gaps called out below. Per-market quote cutoffs are not built. Notifications are single-writer for cold-chase only.

---

## P0 Critical bugs

### 1. Quote sent, Selected, and Outside advance with no client send

**Severity:** P0 — this is the Rosa incident. Stage stamps that imply the client was contacted can be written with no email, SMS, or thread.

**Evidence:**

- Captain lock (handoff §4 and Appendix C, confirmed after the 2026-09-24 rollback): never advance Quote sent / Selected / Outside, or any similar client-facing stamp, without a real client send. Javy rolled Rosa’s Private quotes back when a desk bot set those stamps with no send. Confirm on the Quotes tab and the client thread first.
- There is no stage slug `selected`. “Selected” is `selectedQuoteIds` on the product stage (`src/lib/deals/product-stages.ts`). Picking a quote id is enough for `lateStageNeedsQuoteSelection` to allow `quote_sent`. An outside override makes that check return false even with zero quotes.
- `setDealProductStage` (`src/app/actions/product-stage.ts`, `/deals/[id]`) accepts `surface: "quotes" | "header" | "chip"`. From the Quotes tab, `quotesOnlyStageBlocked` is false (`src/lib/policy/mint-gate.ts`), so Quote sent commits as soon as a quote id is picked. `DealHeaderStage.commit` (`src/components/deals/deal-header-stage.tsx`) calls that action directly. No lookup of sent mail, SMS, or a proposal `sentAt`.
- `#345` outside path is the bypass, not a send. `overrideDealProductStageOutside` builds an override from a reason string (`src/lib/deals/outside-stage-override.ts`, dialog `src/components/deals/outside-stage-override-dialog.tsx`). Targets include `quote_sent`, `bound`, `policy_issued`, `closed_won`. Policy issued with an outside override skips mint and only stamps the stage; a later DEC upload can still mint. The later lock says Outside itself needs a real client send. The dialog does not ask for one.
- The status that sounds like a send is unwired. `pipelineSlugForAgentStatus("sent_to_client")` returns `"quote_sent"` (`src/lib/quotes/outcomes.ts`). `saveQuoteAgentStatusAction` (`src/app/actions/quotes.ts`) is the only caller, and no component imports it.
- Quotes and policies are separate tables, which matches “quotes never mint policies.” The policy row is supposed to appear on Bind / Policy issued (`issuePolicyFromDeclaration`). That part is right. What is wrong is reaching Quote sent / Selected / Outside, and then Policy issued, with no send on the file.

**Impact:** The same Rosa mistake can be repeated from the header or the outside dialog. `/deals?stage=quote_sent`, owner-desk quote-sent counts (`src/lib/home/aggregate.ts`), and the quote-follow-up sequence (anchored on “quote sent” in `src/lib/campaign-sequences/catalog.ts`) all treat the stamp as “the client has the quote.”

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

### 5. Flood shop skip of Southern Oak and Olympus is not enforced on Request Quotes

**Severity:** P1 — Markets, the migration, and Request Quotes are three different rules. Handoff §4 / §11 and Private’s procedure: do not shop Southern Oak or Olympus for Flood. First wave is Neptune, Selective, Tower Hill, Wright only.

**Evidence:**

- Data lock, if the migration ran: `drizzle/0152_strip_false_flood_writers.sql` removes `FLOOD` from `written_lines` for Southern Oak id `1a0bfaf1-9888-45b3-84ea-2425eff3d3c2`, Olympus id `575e1105-3a65-4aa3-83f9-31ee4e6891de`, and any name matching `%southern oak%` or `%olympus%`. Seed does the same in `src/lib/db/seed-southern-oak.ts` and `src/lib/db/seed-javy-bulletins.ts`. Re-adding `FLOOD` on the carrier row undoes it. Nothing in the shop action re-checks the names.
- Markets matcher: `writersForDealLine` (`src/lib/appetite/shop-fits.ts`) keeps only first-wave flood writers when any of them exist (`FIRST_WAVE_FLOOD` in `src/lib/appetite/first-wave.ts`). Test in `src/lib/appetite/shop-fits.test.ts` expects Southern Oak and Olympus absent when those four are present. If none of the four are in the rule set, the function returns every flood writer, including Southern Oak and Olympus.
- Request Quotes: `shopDealQuotes` (`src/app/actions/quotes.ts`) filters with `writesDealLine(carrier.writtenLines, lob)` and `rankFits`. It never calls `writersForDealLine` or `matchFloodShopCarriers` (`src/lib/appetite/javy-flood-shop-list.ts`). Manual ids are added even when the band is not green.

**Impact:** After `0152`, a clean Neon book hides those two carriers because they no longer “write flood.” A re-tag, a missed migration, or a flood shop with no first-wave rows puts them back on the burn list while the Markets panel may still hide them. Portal quoting is paused; the desk burn path is what would still log the attempt.

---

### 6. Named insured is not forced to First Last, and Gemini does not reorder LAST FIRST

**Severity:** P1 — M1 requires the Current term insured to be First Last. Appendix C: Gemini normalizes a DEC printed `LAST FIRST` into First Last.

**Evidence:**

- The Gemini prompt (`src/lib/extraction/gemini/prompt.ts`, named-insured line and the “Dates: keep as printed” rule) says extract the primary named insured as written. It does not mention `LAST FIRST`, swapping tokens, or First Last. A search of `src/lib/extraction` finds no reorder helper.
- Two splitters disagree:
  - `src/lib/quote-sheet/apply.ts` `splitNamedInsured`: one token is copied into both first and last (`"Ana"` → Ana / Ana). The last token is the surname, so `"Robert De Swartz Junior"` becomes last name `Junior`.
  - `src/lib/lifecycle/lead-match.ts` `splitNamedInsured`: one token becomes first name plus last name `"Lead"`. The first token is the given name and the rest is the surname, so `"Rosa Maria Castellanos"` becomes last name `"Maria Castellanos"`. Packet drop (`parseLeadFromPacket`) and co-applicant matching use this one. Sheet fill and contact blanks use the other.
- `primaryApplicantDisplayName` (`src/lib/deals/deal-display-name.ts`) only strips a `·` co-applicant and a duplicated `"Rosa Castellanos ROSA CASTELLANOS"` pair. It does not reorder Last, First. That helper is what keeps a doubled Rosa label from showing twice. It is not a DEC normalizer.
- Mint confirm stores the string it was given (`named_insured` in `src/lib/policy/mint-gate.ts`). `fillContactBlanksFromSheet` writes the sheet splitter onto the contact when the name looks like a placeholder.

**Impact:** A Citizens-style `CASTELLANOS ROSA` dec can land on the policy, the contact, and HealthSherpa as last-name-first, or be split differently depending on whether the name entered through a packet drop or a sheet fill. M1 cannot treat Current term insured as law until one normalizer sits in front of both paths.

---

### 7. Current-term days-left and renewal bands are not ET calendar days

**Severity:** P1 — M1 says days-left and status are computed in ET. Handoff gotcha 1: never bucket “today” with `toISOString().slice`. `#365` fixed task scheduling. Policy and renewal day counts did not follow.

**Evidence:**

- Correct helper: `etDateKey` / `etTodayDateKey` in `src/lib/time/et.ts`. Display uses it via `src/lib/desk/desk-timezone.ts`. Task due parsing (`src/lib/tasks/due-at.test.ts`) and notification timestamps (`#366`) use ET. `#367` round-trips the activity edit modal in ET.
- Policy care strip does not. `daysUntilDate` (`src/lib/book-lists/heat.ts`) is `(date - asOf) / 86_400_000`, not an ET date-key diff. `src/lib/policy/care-strip.ts` uses it for “renewal docs due” inside 30 days. `glanceDate` in the same file formats with `getUTC*` and comments that UTC is intentional so a date-only term does not slip. That is the opposite of M1 for an instant that is evening ET.
- Renewal bands: `daysUntilExpiration` (`src/lib/ams/renewals.ts`) diffs UTC calendar dates of `deskNow()` (`new Date()` in `src/lib/home/as-of.ts`). Bands are `under30` / `30to60` / `60to90` / `90plus` (`src/lib/renewal/urgency.ts`). Between 8pm and midnight ET, “tomorrow” ET is already “today” UTC.
- Owner-desk month math is UTC: `startOfUtcMonth`, `sameUtcMonth`, `isoDate` → `toISOString().slice(0, 10)` (`src/lib/home/as-of.ts`), used by `src/lib/home/kpis.ts`, `src/lib/home/aggregate.ts`, `src/lib/home/birthdays.ts`, `src/lib/home/attention-window.ts`.
- Term roll (`asNoonUtc` in `src/lib/policy/advance-current-term.ts`) and mint dates (`normalizeMintValue` in `src/lib/policy/mint-gate.ts`) still slice `toISOString()` for arbitrary date strings. A Gemini date that `Date` reads as US local midnight can store the previous UTC day. Same pattern on `src/components/policy/policy-inline-fields.tsx`, `correct-term-dates-dialog.tsx`, and `src/components/renewals/cross-sell-panel.tsx`.
- More than one `role = current` term can exist. Advance takes `terms.find(role === current)` (`src/lib/policy/advance-current-term-apply.ts`) while demote lists every current id (`src/lib/policy/offbook-demote-current.ts`). M1’s “one correct Current term” is not a unique constraint.

**Impact:** `/renewals` urgency, Client staying’s 90-day window (`src/lib/renewal/handled.ts`), Policies Overview days-left, and “written this month” on `/` disagree with the ET clock on the desk header. Off-book demote to Prior (`#326` / `#327`) can leave a second current row behind if two were stored.

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

### 12. Renewal Fill Compare writes property facts it does not own

**Severity:** P1 — Appendix C. Fill Compare owns premiums, term dates, deductibles, and coverages on the DEC. It does not own year built, construction, or roof. Those flow from the Risk Profile onto the policy at Policy issued. DEC vs RP conflicts are flagged, not silently overwritten (handoff gotcha 9). Rosa Flood is the live example: RP deductibles $1,000 / $1,000 vs DEC $5,000 / $5,000.

**Evidence:**

- `buildRenewalRiskAndPolicyPatch` in `src/lib/renewal/fill-compare-from-decs.ts` copies Gemini `year_built`, `roof_year` / `roof_age`, and `construction` onto the risk when the risk cell is blank (tests in `src/lib/renewal/fill-compare-from-decs.test.ts` expect year 1998, masonry, roof 2016). It also copies coverage A onto the risk when blank.
- Sheet apply (`src/lib/quote-sheet/apply.ts`) refuses to overwrite a confirmed agent value, including Ana’s Cov A. It does not raise a conflict chip when the DEC value differs. A filled RP deductible stays; the DEC number is dropped with no Rosa-style flag on the deal.
- Flood DEC fill into NFIP fields is implemented and scoped (`src/lib/quote-sheet/flood-dec-fill.test.ts`, `has_nfip` absent on the home sheet). That part of “chips don’t bleed” holds. The renewal patch above is a second writer into the risk, not into the compare columns only.

**Impact:** A blank roof or year built on a renewal gets the DEC’s number and then shops from it. A disagreement on a field the agent already confirmed is invisible. M1’s “property facts come from the Risk Profile” is not what the renewal apply path does.

---

## P2 Missing pieces

### 13. No per-market cutoff. Florida 5pm is not hardcoded — the feature is absent

**Severity:** P2 — `D-2026-09-24-02`. Agency clock stays `America/New_York`. Cutoffs are a timezone plus a wall time per carrier or market. Split ET/CT counties and storm binding freezes are in scope. Do not invent a Florida statutory 5pm bind law.

**Evidence:** Desk “as of” on `/` uses the ET display clock (`src/components/home/owner-desk.tsx`, `src/lib/home/as-of.ts` `deskNow`). Search of `src/` finds no carrier or market `cutoff`, `closeHour`, or freeze flag. `17:00` hits are seed timestamps and calendar tests, not a Florida cutoff constant. Carrier rows have appetite and portal status, not a cutoff timezone.

**Impact:** Nothing warns or blocks a shop after a carrier’s same-day deadline, and nothing can represent a Mountain Time rush window or a CAT freeze. The absence of a hardcoded 5pm is correct. The missing columns are the gap.

---

### 14. Renewal 30/60/90 bands exist; M3 outcomes and campaign sends do not

**Severity:** P2 — `D-2026-09-24-04` and handoff M3. Extend outcomes. Do not rebuild the bands. Keyboard density (`D-2026-09-24-01`) stays parked until the AMS phase; its absence is not a gap.

**Evidence (built):**

- Bands and heat: `src/lib/renewal/urgency.ts` (`under30`, `30to60`, `60to90`, `90plus`). Board: `/renewals`. Queue: `/renewals/queue`.
- Chase copy is 90/60/30, not a second board: `src/lib/renewal/chase.ts` and `shouldQueueAutopilot` in `src/lib/renewal/autopilot.ts` (one nag per band, escalate after silence). Client staying is server-gated to 90 days before `renewalDate` (`src/lib/renewal/handled.ts`, `#364`).
- Composite risk is on the board (`scoreRenewalRisk` in `src/lib/renewal/board-enrich.ts`). `stubRenewalRisk` is leftover and unused by the board.
- Bind still plans 30/60/90 review tasks (`src/lib/crm/bind.ts`).

**Evidence (not built / stub):**

- Day math is UTC (P1 #7), so the bands are real and the clock is wrong at night.
- M3 outcomes stay / shop / rewrite / non-renew are not server-gated paths. The board’s won/lost stages are only `bound` and `lost` (`src/lib/renewal/board-filter.ts`).
- Automations sequence `renewal_60_30` is a task plus email-template stub. `src/lib/campaign-sequences/types.ts` says “Task + email template stubs — nothing sends.” The catalog summary says the same (`src/lib/campaign-sequences/catalog.ts`). Cross-sell on the renewal drawer is the same kind of stub (`src/components/renewals/cross-sell-panel.tsx`).
- Renewal compare refuses to invent premium (`src/lib/renewal/fill-compare-from-decs.ts`). It does write property facts onto the risk (P1 #12).

**Impact:** `/renewals` is the right base for the next outcome (shop, rewrite, or non-renew). Building a new 30/60/90 board, or starting HawkSoft hotkeys in the shopping loop, would ignore standing decisions.

---

### 15. HealthSherpa is integrated, but ACA does not rate inside the desk and keys fail closed

**Severity:** P2 — present, not a stub, easy to think it is live when the vault is empty.

**Evidence:**

- Routes: `/developer/healthsherpa` (review queue, `src/components/healthsherpa/review-queue.tsx`), contact review `/contacts/healthsherpa-review`, vault status on `/settings/developer-hub/api-vault` and on `/deals/[id]`.
- Medicare: `src/lib/healthsherpa/client.ts`, bulk sync `src/lib/healthsherpa/bulk-medicare.ts`, contact sync `src/lib/healthsherpa/sync.ts`. Inbound webhook creates/updates contacts and policies (`src/lib/healthsherpa/inbound.ts`, `upsertHealthSherpaPolicy`). Review enrollments stay in a queue until `resolveHealthSherpaEnrollment`.
- ACA: `healthSherpaAcaStatus` (`src/lib/healthsherpa/aca.ts`) states FitFirst does not quote ACA inside the desk. QuoteConnect runs only with a partner key, ZIP, and applicant age, and opens HealthSherpa Marketplace.
- Sheet field `using_healthsherpa` is a yes/no on the health risk profile (`src/lib/quote-sheet/catalog.ts`). Empty vault copy: “No sync ran.”

**Impact:** Without vault keys, deal HealthSherpa chips show not configured. With keys, Medicare and inbound can create policies. Those policies are not send-gated and are not Ana-aware. ACA premium never lands on a FitFirst quote row by itself.

---

### 16. Gemini DEC read/fill is real and fails closed; date and name normalization are not

**Severity:** P2 — the integration exists. The holes are the date bucket (P1 #7) and named insured (P1 #6), plus key setup.

**Evidence:**

- Client meters `noteDeveloperApiCall("gemini")` (`src/lib/extraction/gemini/client.ts`). Key: `GEMINI_API_KEY` or developer vault (`src/lib/extraction/gemini/key.ts`). Prompt forbids inventing premium, dates, VIN, or carrier (`src/lib/extraction/gemini/prompt.ts`).
- Mint gate (`evaluateMintGate` in `src/lib/policy/mint-gate.ts`) requires a declaration in the quote folder (or, for outside override, on the deal). Missing policy number, premium, or effective date returns `need_dec_fields` and keeps the file. Home vs auto confirm fields differ (no Coverage A on auto).
- Renewal compare uses the same extract (`src/lib/renewal/gemini-diff.ts`, `fill-compare-from-decs.ts`).
- `/policies/new` tells the agent to confirm Gemini fields. There is no second reader if the key is missing; the toast is `gemini-needs-key`.

**Impact:** A missing key blocks fill rather than inventing a premium. A parsed date can still shift a day, and the named insured string is not forced to First Last before it hits the contact.

---

### 17. Filter-first Markets is a second code path from Request Quotes

**Severity:** P2 — the idea is on the Markets panel; the burn does not call it.

**Evidence:**

- Markets: `evaluateShopFits` → `writersForDealLine` + `rankFitsByFirstWave` (`src/lib/appetite/shop-fits.ts`). Red band is skip. Copy on the layout title and `src/lib/quoting/ready-to-shop.ts` says Markets stay filter-first.
- Request Quotes: `shopDealQuotes` re-ranks with `rankFits` / `matchCarrier` and shops greens plus manual ids. It requires the line sheet to be quoting-unlocked (`quotingUnlockedForLine`); otherwise it throws “Approve the Risk Profile before shopping markets.”
- Quote gate skip-decline is applied (`runAndPersistQuoteGate`). Login-issue blocking is off unless `FF_BLOCK_CARRIER_LOGIN_ISSUES=1`.
- Stretch pass shops yellows that do not already have a `quotes` row. It still does not create premiums.

**Impact:** An agent can believe the Flood or Home list on screen is the list that will be attempted. P0 #4 and P1 #5 are the concrete ways those lists diverge.

---

### 18. Authz inside the tenant is “any signed-in user, any record”

**Severity:** P2 — related to P0 #3, called out separately because even a legitimate agent session is unscoped.

**Evidence:** Home renewal-risk load passes `ownerId` for non-admins (`src/app/page.tsx`). Deal mutations do not. `shopDealQuotes(dealId)` and `setDealProductStage({ dealId })` take the id from the client. Agent Policy Access (`/settings/agent-policy-access`) is a settings page, not a check inside those actions.

**Impact:** Javier’s session can stage, shop, and mint Elena’s or Ana’s deal if the id is known. Ids are in URLs.

---

### 19. Click-to-call points at a softphone the shell does not render

**Severity:** P2 — lifecycle lock is “no softphone.” The desk both says that and offers a control that goes nowhere.

**Evidence:**

- `/settings/communications` copy: “Call log on the desk. … No softphone.” Activity close comment in `src/app/actions/activities-desk.ts`: “Not a softphone.” `/phone` renders `DialerStub` (`src/app/phone/page.tsx`).
- `CallButton` (`src/components/activities/call-button.tsx`) links to `/tasks/${id}?softphone=1#desk-softphone`. `SoftphoneDock` (`src/components/softphone/softphone-dock.tsx`) is the only element with `id="desk-softphone"`, and nothing imports it. Settings accordion text still describes an in-desk softphone with a microphone (`src/components/settings/settings-accordion.tsx`). `/ff-softphone.js` is a public path (`src/lib/auth/access.ts`).

**Impact:** An agent following “call” lands on a task URL with a hash that matches no node. The lock (log the call, do not dial in FitFirst) and the button disagree.

---

## P3 Nice-to-have observations

- **HO3 companion sheets.** `companionLines("HO3")` prepares Auto, GL, and workers comp (`src/lib/quoting/forms.ts`). A home shop can sprout worksheets the agent did not ask for.
- **`stubRenewalRisk` is dead on the board** but still exported. Easy to wire the wrong score later.
- **Parked on purpose, not missing.** HawkSoft-style keyboard density is `D-2026-09-24-01` until the AMS phase. MHO denser fields (Catherine) and Gemini Auto photo density stay open teaching items in the handoff; do not treat them as forgotten screens. Portal quoting is paused; `EmptyPortalAdapter` matches that pause. Manual Quotes-tab entry is the agreed path (`recordManualQuote` / life-health writer).
- **Other stubs that look like product:** social BYO cards (`src/lib/social/byo.ts`), Developer Hub API and connections pages, `/onboarding/purchase`, COI/ID portal copy on `/portal/[token]`. The phone contradiction is P2 #19, not a stub to finish.
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
| Renewal 30/60/90 bands and 90/60/30 chase | `renewalUrgencyBand`, `src/lib/renewal/chase.ts`, autopilot one-nag-per-band. Campaign emails still do not send (P2 #14). |
| Client status is derived | `clientStatusFromCounts` in `src/lib/lifecycle/client-status.ts`. Not a typed field. In-force → client, lifetime only → former, none → not a client. |
| Lead match-on-create | `findOrCreateLead` + `isSameLead` in `src/app/actions/crm.ts`. Name alone does not match (`src/lib/lifecycle/lead-match.ts`). |
| One policy per product line | `policyForProduct` tested in `src/lib/policy/mint-gate.test.ts`. |
| Document membership | Unlink vs delete warning in `src/lib/documents/product-doc-membership.ts`. Flood DEC fills `has_nfip` and does not put that key on the home sheet. |
| Off-book demotes current → prior | `src/lib/policy/offbook-demote-current.ts`. Unique “one current term” is still open (P1 #7). |
| Deal-only activity link | Shipped after the handoff pack, as `#367`. The pack listed it in flight. |
| Confirmed sheet cells are not overwritten | `src/lib/quote-sheet/apply.ts`. Conflict is not flagged (P1 #12). |

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
12. **Names.** On a policy whose DEC prints `LAST FIRST`, Policy Overview and the contact should read First Last. Code does not reorder, so expect the printed order unless someone typed it.
13. **Renewal compare.** Run Fill Compare on a policy with a blank year built. Code writes year, roof, and construction onto the risk from the DEC. A filled RP deductible that disagrees with the DEC should stay, with no conflict chip.
14. **Call.** From a task, use the call control. It targets `#desk-softphone`. The dock component is not mounted, so the page should not open a dialer. `/phone` is a stub. Settings → Communications says there is no softphone.
