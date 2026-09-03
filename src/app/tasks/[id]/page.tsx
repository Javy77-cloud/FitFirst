import { notFound } from "next/navigation";
import { deleteReviewTask, updateReviewTask } from "@/app/actions/tasks";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getReviewTask } from "@/lib/db/queries";
import { listRelatedOptions } from "@/lib/db/activity-queries";
import { dayInput } from "@/components/related-tables";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getReviewTask(id);
  if (!task) notFound();
  const options = await listRelatedOptions();

  return (
    <AppShell title={task.title}>
      <form action={updateReviewTask} className="ff-card max-w-xl space-y-3 p-4">
        <input type="hidden" name="id" value={task.id} />
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" defaultValue={task.title} required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Kind</Label>
          <Input name="kind" defaultValue={task.kind} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select name="status" defaultValue={task.status} className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Due</Label>
          <Input name="dueDate" type="date" defaultValue={dayInput(task.dueDate)} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Contact</Label>
          <select name="contactId" defaultValue={task.contactId ?? ""} className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
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
          <select name="policyId" defaultValue={task.policyId ?? ""} className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="">—</option>
            {options.policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Save task
        </Button>
      </form>
      <form action={deleteReviewTask} className="mt-3 max-w-xl">
        <input type="hidden" name="id" value={task.id} />
        <Button type="submit" size="sm" variant="outline">
          Delete task
        </Button>
      </form>
    </AppShell>
  );
}
