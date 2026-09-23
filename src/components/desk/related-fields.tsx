import { Label } from "@/components/ui/label";
import type { listRelatedOptions } from "@/lib/db/activity-queries";

export type RelatedOptions = Awaited<ReturnType<typeof listRelatedOptions>>;

/** activities.assignee may be a user id (email auto-log) or a legacy display name. */
export function resolveAssigneeSelectValue(
  assignee: string | null | undefined,
  users: { id: string; name: string }[],
): string {
  if (!assignee) return "";
  const byId = users.find((u) => u.id === assignee);
  if (byId) return byId.id;
  const byName = users.find((u) => u.name === assignee);
  if (byName) return byName.id;
  return "";
}

export function RelatedRecordFields({
  options,
  defaults,
}: {
  options: RelatedOptions;
  defaults?: {
    contactId?: string | null;
    accountId?: string | null;
    policyId?: string | null;
    dealId?: string | null;
    leadId?: string | null;
    assignee?: string | null;
  };
}) {
  return (
    <>
      <div>
        <Label className="text-xs">Contact</Label>
        <select
          name="contactId"
          defaultValue={defaults?.contactId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.contacts.map((c) => (
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
          defaultValue={defaults?.policyId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.policyNumber}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Deal</Label>
        <select
          name="dealId"
          defaultValue={defaults?.dealId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Business</Label>
        <select
          name="accountId"
          defaultValue={defaults?.accountId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Lead</Label>
        <select
          name="leadId"
          defaultValue={defaults?.leadId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.lastName}, {l.firstName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Assignee</Label>
        <select
          name="assignee"
          defaultValue={resolveAssigneeSelectValue(defaults?.assignee, options.users)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
