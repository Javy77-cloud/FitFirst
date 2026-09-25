# Email templates — weekend revision pack

Draft only. Every row in `src/lib/templates/revision.ts` has `status: "draft"`, so this change does not replace live wording and does not send mail. After the wording is accepted, set that row's `status` to `"chosen"`. Chosen rows replace copy on the send path that already exists (`sendDeskEmail`, the schedule queue, `deliverClientQuoteEmail`, the bind job insert, and `processDueEmailJobs`). There is no second mailer.

Do not merge this as a send. Do not run due jobs until the drops below are chosen, or blank wire stubs can go out with an empty subject.

## Health and life

No desk email template checks `writeLife` or `writeHealth`. Those agency toggles hide Life and Health lines in pickers (`familyHiddenByWriteToggles` in `src/lib/desk/agency-lobs.ts`). They do not turn a template on or off.

The live quote email is the one exception to watch: any product that reaches a late stage, including life or health, uses the same `client-quote` body.

## How to accept a row

In `src/lib/templates/revision.ts`:

- `rewrite` + `chosen` — existing send path uses the subject and body on that row.
- `drop` + `chosen` — that template is not queued or sent when the job is still the template body (or blank).
- `keep` + `chosen` — current copy stays.

Until `chosen`, the current copy below is what the desk still uses.

## Seeded library (`email_templates`, EN + ES)

Source: `src/lib/templates/copy.ts`. Rendered by `src/lib/templates/schedule.ts` (merge fields, then a queued job). Quick Comms and renewal cross-sell read the same rows through `sendDeskEmail`.

| Key | When it fires | Decision |
| --- | --- | --- |
| `google-review-request` | Closed Won + 4 days | rewrite |
| `four-month-check-in` | Closed Won + 4 months | rewrite |
| `renewal-awareness` | 60 days and 30 days before expiration (one body, both triggers, plus a broker task) | rewrite |

Current English subjects:

- `Quick Google review? — {{agency_name}}`
- `You've been my client for four months — {{agency_name}}`
- `I know your renewal is coming — {{agency_name}}`

Current bodies greet `{{contact_first_name}}`, then close with a hardcoded Javier line, `{{agent_phone}}`, and an example-copy footer. Spanish copies do the same.

Recommended rewrite (already in the revision file, still draft): same sentences, footer and Javier close removed, `{{signature}}` at the end. First-name greeting stays.

`sendDeskEmail` was reading the empty legacy `subject` / `body` columns and ignoring `subject_en` / `body_en`. Cross-sell “queue template” now falls back to the English columns. That path still queues. It does not live-send unless the agent picks Send now.

## Sequence stubs

Source: `src/lib/campaign-sequences/catalog.ts`. Eight slugs, seeded into `email_templates`. Turning a sequence on does not send. An agent can still pick the row in Quick Comms or renewal cross-sell, and that uses `sendDeskEmail`.

| Key | Subject | Decision |
| --- | --- | --- |
| `seq-lead-nurture-welcome` | Thanks for reaching out — we'll shop this the right way | keep |
| `seq-lead-nurture-followup` | Still shopping? We can compare your markets this week | keep |
| `seq-quote-ready` | Your quotes are ready — review before we bind | keep |
| `seq-quote-nudge` | Any questions on the quote? | keep |
| `seq-renewal-60` | Your renewal is 60 days out — we'll shop it | keep |
| `seq-renewal-30` | 30 days to renewal — here are your options | keep |
| `seq-cross-sell` | A gap we noticed on your book | keep |
| `seq-review-ask` | How did we do? A quick review helps the next family we shop | keep |

Each body already starts with `Hi {{contact_first_name}}` and ends with `{{signature}}`. Keep them. `seq-review-ask` overlaps `google-review-request`. `seq-renewal-60` / `seq-renewal-30` overlap `renewal-awareness` and the chase notes. Pick one voice per moment before the weekend send. Cross-sell copy names home, auto, and flood only. It is not hidden when Life or Health is off.

## Renewal chase notes

Source: `src/lib/renewal/chase.ts`. Agent action on the renewal card → `sendDeskEmail`.

| Key | Subject pattern | Decision |
| --- | --- | --- |
| `renewal-chase-under30` | We're on your renewal — {days} | rewrite |
| `renewal-chase-30to60` | Watching your renewal — {days} | rewrite |
| `renewal-chase-60to90` | We know this is renewing — {days} | rewrite |
| `renewal-chase-90plus` | We know this is renewing — {days} | rewrite |

Current bodies already use the client's first name. Each ends with `— Your FitFirst agent`. `sendDeskEmail` also appends the agency signature, so the client would get both.

Recommended rewrite: same sentences, hardcoded close removed, `{{signature}}` in the draft. On this path the token is cleared and the existing signature append supplies the close. The 60–90 and 90-plus subjects match, which is easy to mix up.

## Live quote email

Key: `client-quote`. Source: `src/lib/comms/quote-delivery-store.ts`.

- Subject: `Your FitFirst quote`
- Body: `Hi {full name}` plus “Your quote is ready to review…”
- Fires when a late deal stage needs a client send and Gmail is connected.
- Decision: rewrite. Draft subject `Your quote — {{agency_name}}`, first name, same review sentence, `{{signature}}`.
- Not life/health gated.

## Campaign form presets

Source: `src/lib/templates/campaign-presets.ts`. Saving a campaign stores a draft. The send button writes a would-send log and does not open a mailbox. Tokens on these presets are not merged by that stub.

| Key | Current body | Decision |
| --- | --- | --- |
| `campaign-wind-mit` | Please send the wind mit so we can finish shopping. | rewrite — add greeting and `{{signature}}` |
| `campaign-hurricane` | A short reminder to review hurricane deductibles. No SMTP in this build. | rewrite — delete the SMTP line, add greeting and `{{signature}}` |
| `campaign-renewal-watch` | Placeholder renewal template… | drop |

## Stubs to drop

| Key | Current subject | Current body | Why |
| --- | --- | --- | --- |
| `wire-thank-you` | Thank you for binding with FitFirst | Hung on won date. ARCHIVE must not cancel this. | Bind queues won+1 day with no rendered body. Not a client letter. |
| `wire-google-review` | How did we do? | Review ask hung on won date, not pipeline stage. | Bind queues won+4 days. Different slug from `google-review-request`. |
| `macro-lead-followup` | Checking in, {{record.firstName}} | Hi {{record.firstName}} — … This stays in the outbound stub queue. | Manual macro. The sentence says it is a stub. |

Chosen drops skip new bind jobs of those kinds, skip the macro insert, and stop `processDueEmailJobs` from sending a job whose body is still blank or still the template body. Jobs that already have other wording are left alone.

## Not in this pack

These are operational, not weekend client letters: e-sign “Please sign…”, Gmail smoke test, signature test, and the internal agent follow-up reminder (`shouldEmailAgentReminder` already refuses `javy@fitfirst.local`).

Compose shells on the record header and Quick Comms (`Hi {name}`) are empty starts, not stored templates.

The agency signature record (`src/lib/db/seed-brand.ts`) is the `{{signature}}` slot. The seeded signature still contains an example-copy line. Edit that signature in settings before a weekend send so the appended close is not the example footer. This pack does not overwrite the stored signature.
