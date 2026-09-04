import Link from "next/link";
import { upsertActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIVITY_KIND_LABELS, ACTIVITY_KINDS, type ActivityKind } from "@/lib/domain";
import { kindClass } from "@/lib/ops/calendar";
import { cn } from "@/lib/utils";

export function QuickAddLinks({
  hrefFor,
  className,
}: {
  hrefFor: (kind: ActivityKind) => string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {ACTIVITY_KINDS.map((kind) => (
        <Link
          key={kind}
          href={hrefFor(kind)}
          className={cn(
            "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold",
            kindClass(kind),
          )}
        >
          + {ACTIVITY_KIND_LABELS[kind]}
        </Link>
      ))}
    </div>
  );
}

export function QuickAddForm({
  kind,
  contactId,
  policyId,
  dealId,
  returnTo,
}: {
  kind: ActivityKind;
  contactId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  returnTo: string;
}) {
  const label = ACTIVITY_KIND_LABELS[kind];
  const comms = kind === "sms" || kind === "email";
  return (
    <form action={upsertActivity} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="status" value="incomplete" />
      <input type="hidden" name="returnTo" value={returnTo} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      <Input
        name="title"
        required
        className="h-8 min-w-48 flex-1"
        placeholder={comms ? `${label} subject / first line` : `${label} title`}
      />
      {comms ? (
        <Input
          name="notes"
          className="h-8 min-w-48 flex-1"
          placeholder={kind === "sms" ? "SMS body (logged only, no Twilio)" : "Email body (logged only, no SMTP)"}
        />
      ) : null}
      <Button type="submit" size="sm" className={kindClass(kind)}>
        Log {label}
      </Button>
    </form>
  );
}

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      {ACTIVITY_KINDS.map((kind) => (
        <span key={kind} className={cn("rounded px-2 py-0.5 font-semibold", kindClass(kind))}>
          {ACTIVITY_KIND_LABELS[kind]}
        </span>
      ))}
    </div>
  );
}
