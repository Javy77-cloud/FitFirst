import { completeDeskActivity } from "@/app/actions/activities-desk";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { formatWhen } from "@/lib/activities/format";
import { ACTIVITY_COLORS, groupCommsByStoredKey } from "@/lib/desk/comms";
import { decodeMailText } from "@/lib/desk/mail-text";
import type { TimelineItem } from "@/lib/db/queries";

export function CommsTimeline({
  items,
  heading = "Communications",
}: {
  items: TimelineItem[];
  heading?: string;
}) {
  const comms = items.filter((item) =>
    ["email", "sms", "call", "meeting", "task"].includes(item.kind.toLowerCase()),
  );
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

  return (
    <div>
      <h3 className="text-sm font-semibold text-navy">{heading}</h3>

      {threads.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No communications on this record yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
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
                  {thread.channel === "email" ? decodeMailText(thread.subject) || thread.subject : thread.channel}
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
                      <span>{formatWhen(msg.occurredAt)}</span>
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
                      {msg.accountId ? (
                        <RecordLink href={`/accounts/${msg.accountId}`}>Business</RecordLink>
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
      )}
    </div>
  );
}
