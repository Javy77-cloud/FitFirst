import { upsertActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/db/schema";
import { ACTIVITY_KIND_LABELS, ACTIVITY_KINDS, ACTIVITY_STATUSES } from "@/lib/domain";
import { toDateTimeLocal } from "@/lib/ops/calendar";

export type RelatedOptions = {
  contacts: { id: string; firstName: string; lastName: string; phone?: string | null }[];
  deals: { id: string; title: string }[];
  policies: { id: string; policyNumber: string }[];
};

export function ActivityForm({
  activity,
  related,
  defaults,
  returnTo = "/calendar",
  submitLabel = "Save activity",
}: {
  activity?: Activity | null;
  related: RelatedOptions;
  defaults?: {
    kind?: string;
    startAt?: string;
    dueAt?: string;
    contactId?: string;
    dealId?: string;
    policyId?: string;
  };
  returnTo?: string;
  submitLabel?: string;
}) {
  const kind = activity?.kind ?? defaults?.kind ?? "task";
  const seed: Partial<Activity> = {
    contactId: defaults?.contactId ?? activity?.contactId ?? null,
    dealId: defaults?.dealId ?? activity?.dealId ?? null,
    policyId: defaults?.policyId ?? activity?.policyId ?? null,
  };

  return (
    <form action={upsertActivity} className="space-y-3">
      {activity?.id ? <input type="hidden" name="id" value={activity.id} /> : null}
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            name="kind"
            defaultValue={kind}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select
            name="status"
            defaultValue={activity?.status === "open" ? "open" : (activity?.status ?? "open")}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "open"
                  ? "Incomplete"
                  : s === "completed"
                    ? "Completed"
                    : s === "cancelled"
                      ? "Cancelled"
                      : s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Title</Label>
        <Input name="title" required defaultValue={activity?.title ?? ""} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Assignee</Label>
        <Input
          name="assignee"
          defaultValue={activity?.assignee ?? "Desk"}
          className="mt-1 h-8"
          placeholder="Producer or CSR"
        />
      </div>
      <div>
        <Label className="text-xs">Due (tasks / SMS / email)</Label>
        <Input
          type="datetime-local"
          name="dueAt"
          defaultValue={toDateTimeLocal(activity?.dueAt) || defaults?.dueAt || ""}
          className="mt-1 h-8"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Start (meetings / calls)</Label>
          <Input
            type="datetime-local"
            name="startAt"
            defaultValue={toDateTimeLocal(activity?.startAt) || defaults?.startAt || ""}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">End</Label>
          <Input
            type="datetime-local"
            name="endAt"
            defaultValue={toDateTimeLocal(activity?.endAt) ?? ""}
            className="mt-1 h-8"
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Contact</Label>
          <select
            name="contactId"
            defaultValue={seed.contactId ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {related.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Policy</Label>
          <select
            name="policyId"
            defaultValue={seed.policyId ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {related.policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Deal (optional)</Label>
        <select
          name="dealId"
          defaultValue={seed.dealId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {related.deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Assign to a contact and a policy at the same time. Calendar is a view, not the record.
        </p>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <textarea
          name="notes"
          defaultValue={activity?.notes ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" size="sm">
        {submitLabel}
      </Button>
    </form>
  );
}
