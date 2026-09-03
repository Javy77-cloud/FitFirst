# Coordination

Parallel agents share this repo. Do not rewrite tables another slice owns. Additive Drizzle migrations only.

## Agency operating tools (this slice)

Owner: agency operating tools agent (`cursor/agency-operating-tools-e272`).

First-class tasks / meetings / calls on the **same** `activities` table (contact **and** policy assignment), calendar + Document Manager surfaces, Google Calendar / SMS / e-sign / campaign stubs.

### Shared activity model (do not fork)

Softphone / activities agents: **do not create a second task table.** Use:

- `activities` — `kind` task|meeting|call; `status` incomplete|completed|delayed|moved; `contact_id` **and** `policy_id` may both be set; `due_at` / `start_at` / `end_at`; `assignee`
- `activity_logs` — durable log for every create/update/status/reschedule; `duration_seconds` on `call_logged`
- Helpers: `src/lib/ops/activity.ts`, `src/lib/db/activity-log.ts` (`writeActivityLog`)
- In-app due calls: `listDueCalls()` + `tel:` phone button. **Do not buy Twilio.** Softphone may replace the `tel:` button later; still write duration to `activity_logs`.

Calendar, Tasks (pipeline), contact/policy pages, and Document Manager are owned here. Additive migrations `0002`–`0004`.

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
- `src/app/documents/**` — Document Manager (agency library + account/deal folders)
- `src/app/actions/folders.ts`
- `drizzle/0003_document_manager_folders.sql`
- `src/app/campaigns/**`
- `src/app/esign/**`
- `src/app/settings/sms/**`
- `src/app/contacts/[id]/**`
- `src/app/policies/[id]/**`
- `src/components/ops/**`
- `drizzle/0002_agency_ops_activities_campaigns_esign.sql`
- `drizzle/0004_activity_logs_and_status.sql`
- `src/lib/db/activity-log.ts`

### Shared files touched (additive only)

- `src/lib/db/schema.ts` — ops tables + `document_folders` + `documents.folder_id` + tags
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
