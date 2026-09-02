import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import { DocumentTable, EntityUpload } from "@/components/ops/entity-upload";
import { getPolicyWorkspace, listRelatedOptions } from "@/lib/db/ops-queries";
import { formatMoney } from "@/lib/domain";
import { formatWhen, kindClass } from "@/lib/ops/calendar";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();
  const related = await listRelatedOptions();
  const { policy, contact, docs, activities } = workspace;

  return (
    <AppShell title={`Policy ${policy.policyNumber}`}>
      <p className="mb-3 text-sm text-muted-foreground">
        {policy.lineOfBusiness} · {formatMoney(policy.premium)} · expires{" "}
        {policy.expirationDate.toISOString().slice(0, 10)}
        {contact ? ` · ${contact.lastName}, ${contact.firstName}` : ""}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Documents</h2>
          <EntityUpload
            policyId={policy.id}
            contactId={policy.contactId}
            dealId={policy.dealId ?? undefined}
            riskId={policy.riskId ?? undefined}
          />
          <div className="mt-3">
            <DocumentTable docs={docs} returnTo={`/policies/${policy.id}`} />
          </div>
        </section>
        <section className="ff-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Activity</h2>
          <ActivityForm
            related={related}
            defaults={{ kind: "task", policyId: policy.id, contactId: policy.contactId }}
            returnTo={`/policies/${policy.id}`}
            submitLabel="Add activity"
          />
          {activities.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No tasks or meetings on this policy.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link href={`/calendar?activity=${a.id}`} className="text-sm hover:underline">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${kindClass(a.kind)}`}>
                      {a.kind}
                    </span>
                    {a.title} · {formatWhen(a)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
