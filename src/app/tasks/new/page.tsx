import Link from "next/link";
import { createReviewTask } from "@/app/actions/alerts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const contacts = await listContacts();
  const defaultDue = new Date();
  defaultDue.setUTCDate(defaultDue.getUTCDate() + 30);
  return (
    <AppShell
      title="New task"
      actions={
        <Link href="/tasks" className="text-sm text-primary hover:underline">
          Back to tasks
        </Link>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">
        Desk 30/60/90 review task. Assign it to a contact when you can. Quotes still do not create
        a policy.
      </p>
      <form action={createReviewTask} className="ff-card max-w-xl space-y-3 p-4">
        <div>
          <Label htmlFor="title" className="text-xs">
            Title
          </Label>
          <Input id="title" name="title" required className="mt-1 h-8" placeholder="30-day shop follow-up" />
        </div>
        <div>
          <Label htmlFor="kind" className="text-xs">
            Kind
          </Label>
          <select
            id="kind"
            name="kind"
            defaultValue="30_day"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="30_day">30-day</option>
            <option value="60_day">60-day</option>
            <option value="90_day">90-day</option>
            <option value="work_reminder">Work reminder</option>
          </select>
        </div>
        <div>
          <Label htmlFor="dueDate" className="text-xs">
            Due
          </Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            className="mt-1 h-8"
            defaultValue={defaultDue.toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <Label htmlFor="contactId" className="text-xs">
            Contact
          </Label>
          <select
            id="contactId"
            name="contactId"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Unassigned</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.lastName}, {contact.firstName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Save task
        </Button>
      </form>
    </AppShell>
  );
}
