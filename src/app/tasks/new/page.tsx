import { createReviewTask } from "@/app/actions/tasks";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listRelatedOptions } from "@/lib/db/activity-queries";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const options = await listRelatedOptions();
  return (
    <AppShell title="New task">
      <form action={createReviewTask} className="ff-card max-w-xl space-y-3 p-4">
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Kind</Label>
          <Input name="kind" defaultValue="review" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Due</Label>
          <Input name="dueDate" type="date" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Contact</Label>
          <select name="contactId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Policy</Label>
          <select name="policyId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Create task
        </Button>
      </form>
    </AppShell>
  );
}
