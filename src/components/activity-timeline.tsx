import { completeDeskActivity, logDeskActivity } from "@/app/actions/activities-desk";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALL_OUTCOMES, formatDay } from "@/lib/domain";
import type { TimelineItem } from "@/lib/db/queries";

export function ActivityTimeline({
  items,
  contactId,
  accountId,
  policyId,
  dealId,
  heading = "Activity timeline",
}: {
  items: TimelineItem[];
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  heading?: string;
}) {
  return (
    <section className="ff-card p-4">
      <h2 className="text-sm font-semibold text-navy">{heading}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Tasks, meetings, and calls assign to a Contact, Policy, and/or Business. Every one writes
        a log. Call logging is a note — the softphone belongs to the sibling ops agent.
      </p>

      <form action={logDeskActivity} className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        <div>
          <Label className="text-xs">Kind</Label>
          <select
            name="kind"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="task"
          >
            <option value="task">Task</option>
            <option value="meeting">Meeting</option>
            <option value="call">Log a call</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" required className="mt-1 h-8" placeholder="30-day check-in" />
        </div>
        <div>
          <Label className="text-xs">Duration (minutes)</Label>
          <Input name="durationMinutes" type="number" min="1" step="1" className="mt-1 h-8" placeholder="Required for a call" />
        </div>
        <div>
          <Label className="text-xs">Call outcome</Label>
          <select name="outcome" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" defaultValue="">
            <option value="">Not a call / pick when logging a call</option>
            {CALL_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Input name="notes" className="mt-1 h-8" />
        </div>
        <Button type="submit" size="sm">
          Log activity
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet on this record.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                  {item.kind}
                </span>
                <span className="text-[11px] uppercase text-muted-foreground">{item.eventType}</span>
                <span className="text-[11px] text-muted-foreground">{formatDay(item.occurredAt)}</span>
              </div>
              <p className="mt-1">{item.body}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                {item.contactId ? (
                  <RecordLink href={`/contacts/${item.contactId}`}>Contact</RecordLink>
                ) : null}
                {item.accountId ? (
                  <RecordLink href={`/accounts/${item.accountId}`}>Business</RecordLink>
                ) : null}
                {item.policyId ? (
                  <RecordLink href={`/policies/${item.policyId}`}>Policy</RecordLink>
                ) : null}
                {item.dealId ? <RecordLink href={`/deals/${item.dealId}`}>Deal</RecordLink> : null}
                {item.activityId && item.activityStatus === "open" ? (
                  <form action={completeDeskActivity}>
                    <input type="hidden" name="activityId" value={item.activityId} />
                    <Button type="submit" size="xs" variant="ghost">
                      Complete
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
