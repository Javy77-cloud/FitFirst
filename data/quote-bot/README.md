# Auto quote-bot question gaps

Quote-pulling bots log carrier questions that are **not** already on the Auto risk profile. The profile is `AUTO_FIELDS` plus the repeatable vehicle, driver, and household blocks in `src/lib/quote-sheet/`. This list does not add those fields. It only records the ask.

## Where the list lives

`data/quote-bot/auto-question-gaps.json`

One row per similar question. The count goes up when the same carrier (or another carrier) asks it again. Answer choices are a union. Phrasings stay on the row so the most common wording is `canonicalQuestion` (highest count, then alphabetical).

Read it in the repo, or open **Developer → Auto question gaps** (`/developer/auto-question-gaps`).

Each row includes:

- exact question text (and other phrasings)
- answer options, or a free-text note when the carrier offered none
- carrier id and name, with a per-carrier count
- shop line `auto`
- first and last seen timestamps
- recent sightings with optional deal id, portal URL, and selector

## How a bot writes

From a quote script or server path:

```ts
import {
  captureAutoGapsFromAttemptWhy,
  recordAutoQuoteGap,
} from "../src/lib/quote-bot/auto-question-gaps";

recordAutoQuoteGap({
  question: "Are you a good student?",
  options: ["Yes", "No"],
  carrierId: "…",
  carrierName: "Travelers",
  shopLine: "auto",
  dealId: "…",
  url: "https://carrier.example/quote",
  selector: "select[name=goodStudent]",
});

captureAutoGapsFromAttemptWhy({
  why: "Portal Why: Employment required. Waiting employment category.",
  shopLine: "auto",
  carrierName: "Progressive",
  dealId: "…",
  url: "https://quoting.foragentsonly.com",
});
```

`shopLine: "home"` (or any line other than auto) is ignored. A question that already matches the Auto profile — education level, gender, DL number, ownership length, commute days, VIN, and the rest of the catalog — is ignored. The same carrier plus similar wording updates the existing row instead of adding another one.

Live desk paths that already call this:

- `shopDealQuotes` records `observedQuestions` returned by the carrier portal adapter (`src/lib/appetite/portals.ts`)
- `recordManualAttempt` and `logAppetiteResult` scan the attempt note for `Portal Why:`, `leftover:`, `holding —`, and `Waiting …`
- `scripts/ff-progressive-employment-hold.ts` and `scripts/ff-dairyland-and-general.ts` do the same when those bots write a note

A read-only deploy (the app filesystem cannot be updated) skips the write and still saves the quote. Bots running in this checkout append to the JSON file.

## First entries

Seeded from quote-bot notes. Education, gender, DL number, ownership length, and commute days were in those notes and are already on the profile, so they are not rows.

| Question | Carrier | Why it is here |
| --- | --- | --- |
| Employment required (also “employment category”) | Progressive | `scripts/ff-progressive-employment-hold.ts`. Industry and occupation are on the profile. Employment is not. |
| insurance score not found | Dairyland | `scripts/ff-dairyland-and-general.ts`. No Auto insurance-score field. |
| lienholder report details required | Dairyland | Same note. Lienholder name is on the profile. Report details are not. |
