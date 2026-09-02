import { upsertActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/db/schema";
import { ACTIVITY_KINDS, ACTIVITY_STATUSES } from "@/lib/domain";
import { toDateTimeLocal } from "@/lib/ops/calendar";

export type RelatedOptions = {
  contacts: { id: string; firstName: string; lastName: string }[];
  deals: { id: string; title: string }[];
  policies: { id: string; policyNumber: string }[];
};

function relatedValue(activity?: Partial<Activity> | null) {
  if (activity?.policyId) return `policy:${activity.policyId}`;
  if (activity?.dealId) return `deal:${activity.dealId}`;
  if (activity?.contactId) return `contact:${activity.contactId}`;
  return "";
}

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
                {k[0].toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select
            name="status"
            defaultValue={activity?.status ?? "open"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
        <Label className="text-xs">Due (tasks)</Label>
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
      <div>
        <Label className="text-xs">Related record</Label>
        <select
          name="relatedId"
          defaultValue={relatedValue(seed)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          <optgroup label="Contacts">
            {related.contacts.map((c) => (
              <option key={c.id} value={`contact:${c.id}`}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </optgroup>
          <optgroup label="Deals">
            {related.deals.map((d) => (
              <option key={d.id} value={`deal:${d.id}`}>
                {d.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Policies">
            {related.policies.map((p) => (
              <option key={p.id} value={`policy:${p.id}`}>
                {p.policyNumber}
              </option>
            ))}
          </optgroup>
        </select>
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
