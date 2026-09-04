import { completeDeskActivity } from "@/app/actions/activities-desk";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { ACTIVITY_COLORS, groupCommsByStoredKey } from "@/lib/desk/comms";
import type { TimelineItem } from "@/lib/db/queries";

const COMMS_KINDS = new Set(["email", "sms", "call", "meeting", "task"]);

/** Auto-saved desk work. No typed activity log form. */
export function RecordAutoTimeline({ items }: { items: TimelineItem[] }) {
  const comms = items.filter((item) => COMMS_KINDS.has(item.kind.toLowerCase()));
  const other = items.filter((item) => !COMMS_KINDS.has(item.kind.toLowerCase()));
  const threads = groupCommsByStoredKey(
    comms.map((item) => ({
      id: item.id,
      kind: item.kind,
      direction: item.direction ?? "internal",
      eventType: item.eventType,
      subject: item.subject,
      body: item.body,
      fromAddress: item.fromAddress,
      toAddress: item.toAddress,
      occurredAt: item.occurredAt,
      activityId: item.activityId,
      activityStatus: item.activityStatus,
      contactId: item.contactId,
      accountId: item.accountId,
      policyId: item.policyId,
      dealId: item.dealId,
      leadId: item.leadId,
    })),
    comms.map((item) => item.threadKey),
  );

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing from the desk yet. Email, SMS, calls, meetings, and tasks done from this record
        land here automatically. There is no typed activity log.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Auto-saved from the desk — inbound and outbound. Emails stay as one conversation. SMS,
        calls, meetings, and tasks share this timeline. Desk stubs only; no Twilio or SendGrid.
      </p>
      {threads.length > 0 ? (
        <ol className="space-y-3">
          {threads.map((thread) => (
            <li key={thread.threadKey} className="rounded-md border border-border">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <span
                  className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white"
                  style={{ background: ACTIVITY_COLORS[thread.channel] ?? "#5c6b7a" }}
                >
                  {thread.channel}
                </span>
                <span className="text-sm font-medium text-navy">
                  {thread.channel === "email" ? thread.subject : thread.channel}
                </span>
                {thread.messages.length > 1 ? (
                  <span className="text-[11px] text-muted-foreground">
                    {thread.messages.length} messages
                  </span>
                ) : null}
              </div>
              <ol className="divide-y divide-border">
                {thread.messages.map((msg) => (
                  <li key={msg.id} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-muted-foreground">
                      <span>{msg.direction}</span>
                      <span>{msg.eventType}</span>
                      <span>{formatDay(msg.occurredAt)}</span>
                    </div>
                    {msg.fromAddress || msg.toAddress ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {msg.fromAddress ? `From ${msg.fromAddress}` : ""}
                        {msg.fromAddress && msg.toAddress ? " · " : ""}
                        {msg.toAddress ? `To ${msg.toAddress}` : ""}
                      </p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      {msg.contactId ? (
                        <RecordLink href={`/contacts/${msg.contactId}`}>Contact</RecordLink>
                      ) : null}
                      {msg.policyId ? (
                        <RecordLink href={`/policies/${msg.policyId}`}>Policy</RecordLink>
                      ) : null}
                      {msg.dealId ? <RecordLink href={`/deals/${msg.dealId}`}>Deal</RecordLink> : null}
                      {msg.activityId && msg.activityStatus === "open" ? (
                        <form action={completeDeskActivity}>
                          <input type="hidden" name="activityId" value={msg.activityId} />
                          <Button type="submit" size="xs" variant="ghost">
                            Complete
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      ) : null}
      {other.length > 0 ? (
        <ol className="space-y-2">
          {other.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                  {item.kind}
                </span>
                <span className="text-[11px] uppercase text-muted-foreground">{item.eventType}</span>
                <span className="text-[11px] text-muted-foreground">{formatDay(item.occurredAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
