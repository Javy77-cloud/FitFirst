# Coordination

Parallel agents share this repo. Do not rewrite tables another slice owns. Additive Drizzle migrations only.

## Agency operating tools (this slice)

Owner: agency operating tools agent (`cursor/agency-operating-tools-e272`).

First-class tasks / meetings / calls, calendar (month/week/day), Google Calendar **interface only**, document tagging on contact/deal/policy, stub email campaigns, SMS connector stub, e-sign envelope stub.

### Files owned

- `src/lib/ops/**`
- `src/lib/integrations/**`
- `src/lib/db/ops-queries.ts`
- `src/app/actions/activities.ts`
- `src/app/actions/connectors.ts`
- `src/app/actions/campaigns.ts`
- `src/app/actions/esign.ts`
- `src/app/actions/sms.ts`
- `src/app/actions/contacts-ops.ts`
- `src/app/calendar/**`
- `src/app/tasks/**`
- `src/app/documents/**`
- `src/app/campaigns/**`
- `src/app/esign/**`
- `src/app/settings/sms/**`
- `src/app/contacts/[id]/**`
- `src/app/policies/[id]/**`
- `src/components/ops/**`
- `drizzle/0002_agency_ops_activities_campaigns_esign.sql`

### Shared files touched (additive only)

- `src/lib/db/schema.ts` — new ops tables + nullable document parent ids, `tags` on contacts/documents
- `src/lib/domain.ts` — activity / campaign / e-sign / SMS / `signed_app` constants
- `src/lib/db/queries.ts` — deal documents also match `deal_id`
- `src/lib/db/seed.ts` — Ana Dib tags + one task + one meeting + draft campaign (fixture JSON untouched)
- `src/lib/fixtures/ids.ts` — ops seed ids
- `src/app/actions/documents.ts` — contact/policy/tags upload; extraction still requires a risk
- `src/components/app-shell.tsx` — Calendar, Documents, Tasks, Campaigns + E-sign/SMS footer
- `src/components/deal/documents-panel.tsx` — tags, signed app, send for signature
- `src/app/deals/[id]/page.tsx` — pass `contactId` into documents panel
- `src/app/contacts/page.tsx` / `src/app/policies/page.tsx` — link to detail
- `src/app/globals.css` — `.ff-cal-*` and `.ff-stub` using `--ff-*` tokens

### Do not

- Edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`
- Change appetite matching
- Call Zoho, Twilio, Google, DocuSign, SMTP, or store provider secrets
