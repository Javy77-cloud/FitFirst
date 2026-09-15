import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { accountDisplayName } from "@/lib/crm/bind";
import { daysUntil, taskKindLabel } from "@/lib/crm/display";
import { formatTaskDueAt } from "@/lib/tasks/due-at";
import { listPolicies, listReviewQueue } from "@/lib/db/queries";
import { REVIEWS_EXPIRING_COLUMNS } from "@/lib/list-columns";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [queue, policies] = await Promise.all([listReviewQueue(), listPolicies()]);
  const expiring = policies.filter(({ policy }) => daysUntil(policy.expirationDate) <= 90);

  return (
    <AppShell title="Reviews & expirations">
      <p className="mb-3 text-sm text-muted-foreground">
        30/60/90 and expiration tasks stay in the desk. Completing a task writes client history.
        Nothing emails the agent.
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Open review tasks
          </div>
          {queue.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No open tasks. Bind a deal to schedule 30/60/90 and expiration follow-ups.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {queue.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {taskKindLabel(task.kind)} · due {formatTaskDueAt(task.dueDate)}
                      {task.contactId ? (
                        <>
                          {" · "}
                          <Link href={`/contacts/${task.contactId}`} className="text-primary hover:underline">
                            Contact
                          </Link>
                        </>
                      ) : null}
                      {task.policyId ? (
                        <>
                          {" · "}
                          <Link href={`/policies/${task.policyId}`} className="text-primary hover:underline">
                            Policy
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <CompleteTaskForm taskId={task.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ff-card overflow-x-auto">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Expiring within 90 days
          </div>
          <DeskColumnTable
            moduleId="reviews-expiring"
            columns={REVIEWS_EXPIRING_COLUMNS}
            empty="No in-window expirations. Policies appear here after bind."
            rows={expiring.map(({ policy, contact }) => ({
              key: policy.id,
              cells: {
                policy: (
                  <Link href={`/policies/${policy.id}`} className="font-medium text-primary hover:underline">
                    {policy.policyNumber}
                  </Link>
                ),
                client: contact ? (
                  <Link href={`/contacts/${contact.id}`} className="hover:underline">
                    {accountDisplayName(contact)}
                  </Link>
                ) : (
                  "—"
                ),
                expires: <ExpirationBadge date={policy.expirationDate} />,
              },
            }))}
          />
        </section>
      </div>
    </AppShell>
  );
}
