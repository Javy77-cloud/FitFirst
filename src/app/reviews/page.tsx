import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { accountDisplayName } from "@/lib/crm/bind";
import { daysUntil, formatIsoDate, taskKindLabel } from "@/lib/crm/display";
import { ColumnPickerMenu } from "@/components/crm/column-picker";
import { SheetHeader } from "@/components/sheet/sheet-header";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { listPolicies, listReviewQueue } from "@/lib/db/queries";

const EXPIRING_COLUMNS = [
  { id: "policy", header: "Policy", defaultVisible: true },
  { id: "client", header: "Insured / contact name", defaultVisible: true },
  { id: "expires", header: "Expires", defaultVisible: true },
];

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [queue, policies] = await Promise.all([listReviewQueue(), listPolicies()]);
  const expiring = policies.filter(({ policy }) => daysUntil(policy.expirationDate) <= 90);

  return (
    <AppShell
      title="Reviews & expirations"
      columns={<ColumnPickerMenu tableId="reviews-expiring" columns={EXPIRING_COLUMNS} />}
    >
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
                      {taskKindLabel(task.kind)} · due {formatIsoDate(task.dueDate)}
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
          {expiring.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No in-window expirations. Policies appear here after bind.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  {EXPIRING_COLUMNS.map((col) => (
                    <SheetHeader key={col.id} table="reviews-expiring" col={col.id} dataCol={col.id}>
                      {col.header}
                    </SheetHeader>
                  ))}
                </tr>
              </thead>
              <SheetTbody>
                {expiring.map(({ policy, contact }) => (
                  <tr key={policy.id}>
                    <td data-col="policy" data-sheet-col="policy">
                      <Link href={`/policies/${policy.id}`} className="font-medium text-primary hover:underline">
                        {policy.policyNumber}
                      </Link>
                    </td>
                    <td data-col="client" data-sheet-col="client">
                      {contact ? (
                        <Link href={`/contacts/${contact.id}`} className="hover:underline">
                          {accountDisplayName(contact)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      data-col="expires"
                      data-sheet-col="expires"
                      data-sort={policy.expirationDate.toISOString()}
                    >
                      <ExpirationBadge date={policy.expirationDate} />
                    </td>
                  </tr>
                ))}
              </SheetTbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
