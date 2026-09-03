import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { accountDisplayName } from "@/lib/crm/bind";
import { formatMoney } from "@/lib/domain";
import { formatIsoDate, formatTenure, taskKindLabel } from "@/lib/crm/display";
import { getPolicyWorkspace } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();
  const { policy, contact, carrier, deal, tasks } = workspace;

  return (
    <AppShell title={policy.policyNumber}>
      <p className="mb-3 text-sm text-muted-foreground">
        Written from bind
        {deal ? (
          <>
            {" "}
            on{" "}
            <Link href={`/deals/${deal.id}`} className="text-primary hover:underline">
              {deal.title}
            </Link>
          </>
        ) : null}
        . This row did not come from a quote.
      </p>

      <dl className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ff-card p-4">
          <dt className="text-[11px] uppercase text-muted-foreground">
            {contact?.accountKind === "commercial" ? "Business" : "Contact"}
          </dt>
          <dd className="text-sm font-medium">
            {contact ? (
              <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                {accountDisplayName(contact)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
          <dd className="text-xs text-muted-foreground">
            Tenure {contact ? formatTenure(contact.tenureStart) : "—"} · lifetime{" "}
            {contact?.policyCount ?? 0} · active {contact?.activePolicyCount ?? 0}
          </dd>
        </div>
        <div className="ff-card p-4">
          <dt className="text-[11px] uppercase text-muted-foreground">Carrier / line</dt>
          <dd className="text-sm font-medium">
            {carrier?.name ?? "—"} · {policy.lineOfBusiness}
          </dd>
          <dd className="text-xs text-muted-foreground">{policy.status}</dd>
        </div>
        <div className="ff-card p-4">
          <dt className="text-[11px] uppercase text-muted-foreground">Premium</dt>
          <dd className="text-sm font-medium">{formatMoney(policy.premium)}</dd>
          <dd className="text-xs text-muted-foreground">
            Effective {formatIsoDate(policy.effectiveDate)}
          </dd>
        </div>
        <div className="ff-card p-4">
          <dt className="text-[11px] uppercase text-muted-foreground">Expiration</dt>
          <dd className="text-sm font-medium">
            <ExpirationBadge date={policy.expirationDate} />
          </dd>
        </div>
      </dl>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Review tasks
        </div>
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No review tasks on this policy.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {taskKindLabel(task.kind)} · due {formatIsoDate(task.dueDate)} · {task.status}
                  </div>
                </div>
                {task.status === "open" ? <CompleteTaskForm taskId={task.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
