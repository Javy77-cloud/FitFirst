import Link from "next/link";
import { Phone } from "lucide-react";
import { logCallDuration, moveActivityDay, setActivityStatus } from "@/app/actions/activities";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Activity, ActivityLog } from "@/lib/db/schema";
import { ACTIVITY_STATUSES, ACTIVITY_STATUS_LABELS } from "@/lib/domain";
import { callDurationLabel } from "@/lib/ops/activity";
import { cn } from "@/lib/utils";

export function PhoneButton({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  if (!phone) {
    return <span className="text-[11px] text-muted-foreground">No number on contact</span>;
  }
  return (
    <a href={`tel:${phone}`} className={cn(buttonVariants({ size: "sm" }), className)}>
      <Phone className="size-3.5" />
      Call {phone}
    </a>
  );
}

export function ActivityStatusActions({
  activity,
  returnTo,
}: {
  activity: Activity;
  returnTo: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ACTIVITY_STATUSES.map((status) => (
        <form key={status} action={setActivityStatus}>
          <input type="hidden" name="id" value={activity.id} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button
            type="submit"
            size="xs"
            variant={activity.status === status ? "default" : "outline"}
          >
            {ACTIVITY_STATUS_LABELS[status]}
          </Button>
        </form>
      ))}
    </div>
  );
}

export function MoveDayForm({
  activityId,
  returnTo,
}: {
  activityId: string;
  returnTo: string;
}) {
  return (
    <form action={moveActivityDay} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={activityId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Input type="datetime-local" name="newDay" required className="h-8 w-48" />
      <Button type="submit" size="xs" variant="outline">
        Move to another day
      </Button>
    </form>
  );
}

export function LogCallForm({
  activityId,
  returnTo,
}: {
  activityId: string;
  returnTo: string;
}) {
  return (
    <form action={logCallDuration} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={activityId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Input name="minutes" type="number" min={0} defaultValue={3} className="h-8 w-16" />
      <span className="text-[11px] text-muted-foreground">min</span>
      <Input name="seconds" type="number" min={0} max={59} defaultValue={0} className="h-8 w-16" />
      <span className="text-[11px] text-muted-foreground">sec</span>
      <Button type="submit" size="xs">
        Log duration
      </Button>
    </form>
  );
}

export function ActivityLogList({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground">No log yet. Every save writes a durable row.</p>;
  }
  return (
    <ul className="space-y-1.5 text-xs">
      {logs.map((log) => (
        <li key={log.id} className="border-b border-border pb-1.5 last:border-0">
          <div className="font-medium text-navy">
            {log.eventType.replaceAll("_", " ")}
            {log.durationSeconds != null ? ` · ${callDurationLabel(log.durationSeconds)}` : ""}
          </div>
          <div className="text-muted-foreground">{log.body}</div>
          <div className="text-[10px] text-muted-foreground">
            {log.occurredAt.toLocaleString("en-US")}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AssignmentLinks({
  contactId,
  contactName,
  policyId,
  policyNumber,
  dealId,
  dealTitle,
}: {
  contactId?: string | null;
  contactName?: string | null;
  policyId?: string | null;
  policyNumber?: string | null;
  dealId?: string | null;
  dealTitle?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {contactId ? (
        <Link href={`/contacts/${contactId}`} className="text-primary hover:underline">
          Contact {contactName ?? contactId.slice(0, 8)}
        </Link>
      ) : (
        <span className="text-muted-foreground">No contact</span>
      )}
      {policyId ? (
        <Link href={`/policies/${policyId}`} className="text-primary hover:underline">
          Policy {policyNumber ?? policyId.slice(0, 8)}
        </Link>
      ) : (
        <span className="text-muted-foreground">No policy</span>
      )}
      {dealId ? (
        <Link href={`/deals/${dealId}`} className="text-primary hover:underline">
          Deal {dealTitle ?? ""}
        </Link>
      ) : null}
    </div>
  );
}
