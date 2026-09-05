import { addServiceNote } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  SERVICE_TIMELINE_DISCLAIMER,
  serviceTimelineEventLabel,
} from "@/lib/domain-ams";

export type ServiceTimelineItem = {
  id: string;
  eventType: string;
  body: string;
  occurredAt: Date | string;
  activityTitle?: string | null;
};

export function ServiceTimelinePanel({
  policyId,
  items,
  error,
  notice,
}: {
  policyId: string;
  items: ServiceTimelineItem[];
  error?: string;
  notice?: string;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Service timeline</h2>
      <p className="mt-1 text-base text-muted-foreground">{SERVICE_TIMELINE_DISCLAIMER}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice === "note_logged" ? (
        <p className="mt-2 text-sm text-navy">Servicing note written to the activity log.</p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No servicing activity on this Policy yet. Tasks and calls stay on the activity timeline
          below.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                  {serviceTimelineEventLabel(item.eventType)}
                </span>
                <span className="text-sm text-muted-foreground">{formatDay(item.occurredAt)}</span>
              </div>
              {item.activityTitle ? (
                <p className="mt-1 text-sm font-medium text-navy">{item.activityTitle}</p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      )}

      <form action={addServiceNote} className="mt-4 grid gap-2 border-t border-border pt-4">
        <input type="hidden" name="policyId" value={policyId} />
        <Textarea
          name="body"
          required
          rows={3}
          placeholder="Servicing note — does not file and does not bind."
        />
        <Button type="submit" size="sm">
          Log servicing note
        </Button>
      </form>
    </section>
  );
}
