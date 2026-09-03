import Link from "next/link";
import { createTask } from "@/app/actions/alerts";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker } from "@/components/crm/column-picker";
import { TaskRowEditor } from "@/components/crm/task-row-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountDisplayName } from "@/lib/crm/bind";
import { formatIsoDate, taskKindLabel } from "@/lib/crm/display";
import { listAllTasks, listContacts, listDeals } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { id: "title", header: "Task", defaultVisible: true, hideable: false },
  { id: "kind", header: "Kind", defaultVisible: true },
  { id: "status", header: "Status", defaultVisible: true },
  { id: "due", header: "Due", defaultVisible: true },
  { id: "contact", header: "Contact", defaultVisible: true },
  { id: "deal", header: "Deal", defaultVisible: true },
  { id: "policy", header: "Policy", defaultVisible: false },
  { id: "actions", header: "Actions", defaultVisible: true, hideable: false },
];

export default async function TasksPage() {
  const [rows, contacts, deals] = await Promise.all([listAllTasks(), listContacts(), listDeals()]);

  return (
    <AppShell title="Tasks">
      <p className="mb-3 text-sm text-muted-foreground">
        Add, edit, or delete follow-ups here. Completing a task still writes client history. The
        Reviews page stays the open queue plus expirations.
      </p>
      <form action={createTask} className="ff-card mb-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <Label htmlFor="title" className="text-xs">
            Title
          </Label>
          <Input id="title" name="title" required className="mt-1 h-8" placeholder="Call Ana about HO3" />
        </div>
        <div>
          <Label htmlFor="kind" className="text-xs">
            Kind
          </Label>
          <select
            id="kind"
            name="kind"
            defaultValue="task"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="task">Task</option>
            <option value="call">Call</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="30_day">30-day</option>
            <option value="60_day">60-day</option>
            <option value="90_day">90-day</option>
            <option value="expiration">Expiration</option>
          </select>
        </div>
        <div>
          <Label htmlFor="dueDate" className="text-xs">
            Due
          </Label>
          <Input id="dueDate" name="dueDate" type="date" className="mt-1 h-8" placeholder="YYYY-MM-DD" />
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
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {accountDisplayName(contact)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="dealId" className="text-xs">
            Deal
          </Label>
          <select
            id="dealId"
            name="dealId"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Add task
          </Button>
        </div>
      </form>

      <ColumnPicker tableId="tasks" columns={COLUMNS}>
        <section className="ff-card overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.id} data-col={col.id}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-muted-foreground">
                    No tasks yet. Add one above or log outreach from a deals row.
                  </td>
                </tr>
              ) : (
                rows.map(({ task, contact, policy, deal }) => (
                  <tr key={task.id}>
                    <td data-col="title" className="font-medium">
                      {task.title}
                    </td>
                    <td data-col="kind">{taskKindLabel(task.kind)}</td>
                    <td data-col="status" className="capitalize">
                      {task.status}
                    </td>
                    <td data-col="due">{formatIsoDate(task.dueDate)}</td>
                    <td data-col="contact">
                      {contact ? (
                        <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                          {accountDisplayName(contact)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-col="deal">
                      {deal ? (
                        <Link href={`/deals/${deal.id}`} className="hover:underline">
                          {deal.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-col="policy">
                      {policy ? (
                        <Link href={`/policies/${policy.id}`} className="hover:underline">
                          {policy.policyNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-col="actions">
                      <TaskRowEditor
                        task={{
                          id: task.id,
                          title: task.title,
                          kind: task.kind,
                          status: task.status,
                          dueDate: formatIsoDate(task.dueDate),
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </ColumnPicker>
    </AppShell>
  );
}
