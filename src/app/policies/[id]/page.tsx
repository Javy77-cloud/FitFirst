import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import { DocumentTable, EntityUpload } from "@/components/ops/entity-upload";
import { getPolicyWorkspace, listRelatedOptions } from "@/lib/db/ops-queries";
import { formatMoney } from "@/lib/domain";
import {
  ActivityStatusActions,
  AssignmentLinks,
  PhoneButton,
} from "@/components/ops/activity-extras";
import { QuickAddForm, QuickAddLinks } from "@/components/ops/quick-add";
import { type ActivityKind } from "@/lib/domain";
import { formatWhen, kindClass, isActivityKind } from "@/lib/ops/calendar";
import { statusLabel } from "@/lib/ops/activity";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const kindParam = typeof query.kind === "string" ? query.kind : "";
  const newKind: ActivityKind = isActivityKind(kindParam) ? kindParam : "task";
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
          <h2 className="mb-2 text-sm font-semibold text-navy">Activities</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            First-class on this policy and its contact. Same <code>activities</code> table as the
            calendar. SMS and email log here — would send, no Twilio / SMTP.
          </p>
          <div className="mb-3">
            <QuickAddLinks hrefFor={(k) => `/policies/${policy.id}?kind=${k}#schedule`} />
          </div>
          {contact?.phone ? (
            <div className="mb-2">
              <PhoneButton phone={contact.phone} />
            </div>
          ) : null}
          <div id="schedule" className="space-y-3">
            {(newKind === "sms" || newKind === "email") && (
              <QuickAddForm
                kind={newKind}
                contactId={policy.contactId}
                policyId={policy.id}
                returnTo={`/policies/${policy.id}`}
              />
            )}
            <ActivityForm
              related={related}
              defaults={{ kind: newKind, policyId: policy.id, contactId: policy.contactId }}
              returnTo={`/policies/${policy.id}`}
              submitLabel="Add to this policy"
            />
          </div>
          {activities.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No tasks, calls, meetings, SMS, or email on this policy.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activities.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2">
                  <Link href={`/calendar?activity=${a.id}`} className="text-sm font-medium hover:underline">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${kindClass(a.kind)}`}>
                      {a.kind}
                    </span>
                    {a.title}
                  </Link>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {formatWhen(a)} · {statusLabel(a.status)}
                  </div>
                  <AssignmentLinks contactId={a.contactId} policyId={a.policyId} dealId={a.dealId} />
                  <div className="mt-2">
                    <ActivityStatusActions activity={a} returnTo={`/policies/${policy.id}`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
