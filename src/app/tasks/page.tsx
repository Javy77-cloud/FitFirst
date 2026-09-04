import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { RecordLink } from "@/components/record-links";
import { buttonVariants } from "@/components/ui/button";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay } from "@/lib/domain";
import { listReviewTasks } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await listReviewTasks({ all: true });
  return (
    <AppShell
      title="Tasks"
      actions={
        <Link href="/tasks/new" className={cn(buttonVariants())}>
          New task
        </Link>
      }
      columns={<ColumnPicker tableKey="tasks" initial={defaultColumns("tasks")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Desk review tasks. Add, edit, or delete. Communication logs still live on the Contact,
        Deal, and Policy records.
      </p>
      <section className="ff-card overflow-x-auto">
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No review tasks.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="tasks" col="title" as="th">Task</Col>
                <Col table="tasks" col="due" as="th">Due</Col>
                <Col table="tasks" col="status" as="th">Status</Col>
                <Col table="tasks" col="kind" as="th">Kind</Col>
                <Col table="tasks" col="related" as="th">Related</Col>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <Col table="tasks" col="title">
                    <RecordLink href={`/tasks/${task.id}`}>{task.title}</RecordLink>
                  </Col>
                  <Col table="tasks" col="due">{formatDay(task.dueDate)}</Col>
                  <Col table="tasks" col="status">{task.status}</Col>
                  <Col table="tasks" col="kind">{task.kind}</Col>
                  <Col table="tasks" col="related">
                    {task.contactId ? (
                      <RecordLink href={`/contacts/${task.contactId}`}>Contact</RecordLink>
                    ) : null}{" "}
                    {task.policyId ? (
                      <RecordLink href={`/policies/${task.policyId}`}>Policy</RecordLink>
                    ) : null}{" "}
                    {task.dealId ? <RecordLink href={`/deals/${task.dealId}`}>Deal</RecordLink> : null}
                    {task.accountId ? (
                      <RecordLink href={`/accounts/${task.accountId}`}>Business</RecordLink>
                    ) : null}
                  </Col>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
