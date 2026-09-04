import Link from "next/link";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { AppShell } from "@/components/app-shell";
import { RelatedRecordFields } from "@/components/desk/related-fields";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentDeskSession } from "@/lib/auth/session";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { getTelephonySettings, listCallLog } from "@/lib/db/queries";
import { CALL_OUTCOMES, TELEPHONY_PROVIDER_LABEL, formatDay, type TelephonyProvider } from "@/lib/domain";

export const dynamic = "force-dynamic";

function durationLabel(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.max(0, Math.round(seconds / 60));
  return `${mins} min`;
}

export default async function PhonePage() {
  const [rows, options, telephony, session] = await Promise.all([
    listCallLog(),
    listRelatedOptions(),
    getTelephonySettings(),
    currentDeskSession(),
  ]);
  const provider = (telephony?.provider ?? "none") as TelephonyProvider;
  const connected = Boolean(telephony?.connected);

  return (
    <AppShell title="Phone call log">
      <p className="mb-3 text-sm text-muted-foreground">
        In-desk call log — not a softphone. Every entry attaches to a Contact, Policy, Deal, Lead,
        or Business the same way platform auto-activity does. Duration and outcome are required.
        The agency pays the trunk later; nothing dials from here.
      </p>

      <div className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="font-medium text-navy">Line: </span>
        {connected ? (
          <>
            {TELEPHONY_PROVIDER_LABEL[provider] ?? provider} · from{" "}
            {telephony?.displayFrom ?? "not provisioned"} · stub connected
          </>
        ) : (
          <>Not connected. Log calls anyway — BYO Twilio / SIP is Admin settings.</>
        )}
        {session.isAdmin ? (
          <>
            {" "}
            <Link href="/settings/phone" className="text-primary hover:underline">
              Phone settings
            </Link>
          </>
        ) : (
          <> Ask an admin to connect the agency line.</>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Log a call</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Writes <code>activities</code> + <code>activity_logs</code> on the records you attach.
          </p>
          <form action={logDeskActivity} className="mt-3 grid gap-2">
            <input type="hidden" name="kind" value="call" />
            <div>
              <Label className="text-xs" htmlFor="call-title">
                Title
              </Label>
              <Input id="call-title" name="title" required className="mt-1 h-8" placeholder="Harbor follow-up" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs" htmlFor="call-duration">
                  Duration (minutes)
                </Label>
                <Input
                  id="call-duration"
                  name="durationMinutes"
                  type="number"
                  min="1"
                  required
                  className="mt-1 h-8"
                  placeholder="8"
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="call-outcome">
                  Outcome
                </Label>
                <select
                  id="call-outcome"
                  name="outcome"
                  required
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  defaultValue="connected"
                >
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">When</Label>
                <Input name="startAt" type="datetime-local" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Number</Label>
                <Input name="phoneNumber" className="mt-1 h-8" placeholder="(321) 555-0188" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Direction</Label>
              <select
                name="direction"
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                defaultValue="outbound"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <RelatedRecordFields options={options} />
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" className="mt-1 min-h-16" />
            </div>
            <Button type="submit" size="sm">
              Log call
            </Button>
          </form>
        </section>

        <section className="ff-card overflow-x-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Call history</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length === 0 ? "No calls logged yet." : `${rows.length} logged on the desk.`}
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Log the first call on the left, or from Contact / Policy 360.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Call</th>
                  <th>Duration</th>
                  <th>Outcome</th>
                  <th>Attached</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ activity, contact, policy, deal, lead, business }) => (
                  <tr key={activity.id}>
                    <td className="whitespace-nowrap text-xs">
                      {formatDay(activity.startAt ?? activity.dueAt ?? activity.updatedAt)}
                    </td>
                    <td>
                      <div className="font-medium text-navy">{activity.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.direction ?? "logged"}
                        {activity.phoneNumber ? ` · ${activity.phoneNumber}` : ""}
                      </div>
                    </td>
                    <td>{durationLabel(activity.durationSeconds)}</td>
                    <td className="capitalize">{activity.outcome?.replaceAll("_", " ") ?? "—"}</td>
                    <td className="text-xs">
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {contact ? (
                          <RecordLink href={`/contacts/${contact.id}`}>
                            {contact.lastName}, {contact.firstName}
                          </RecordLink>
                        ) : null}
                        {policy ? (
                          <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                        ) : null}
                        {deal ? <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink> : null}
                        {business ? (
                          <RecordLink href={`/accounts/${business.id}`}>{business.name}</RecordLink>
                        ) : null}
                        {lead ? (
                          <RecordLink href={`/leads/${lead.id}`}>
                            Lead {lead.lastName}
                          </RecordLink>
                        ) : null}
                        {!contact && !policy && !deal && !business && !lead ? "—" : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
