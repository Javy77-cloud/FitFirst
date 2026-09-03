import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { CertificatesList, LocationsList } from "@/components/desk-ams-panels";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RelatedDeals, RelatedPolicies } from "@/components/related-tables";
import { formatMoney } from "@/lib/domain";
import { getAccountWorkspace, listEmailTemplates } from "@/lib/db/queries";
import { toNumber } from "@/lib/commissions/math";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, templates] = await Promise.all([getAccountWorkspace(id), listEmailTemplates()]);
  if (!workspace) notFound();
  const {
    account,
    policies,
    deals,
    contacts,
    policyCount,
    activePolicyCount,
    clientStatus,
    timeline,
    locations,
    certificates,
  } = workspace;
  const premium = policies.reduce((sum, row) => sum + toNumber(row.policy.premium), 0);

  return (
    <AppShell title={account.name}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime <strong>{policyCount}</strong>
        </span>
        <span>
          In-force <strong>{activePolicyCount}</strong>
        </span>
      </div>

      <RecordSection id="record" title="This business" summary={`${account.ein ?? "No EIN"} · comms stay on this record`}>
        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">EIN / FEIN</dt>
            <dd>{account.ein ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Entity</dt>
            <dd>{account.entityType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Employees</dt>
            <dd>{account.employeeCount ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Annual sales</dt>
            <dd>{formatMoney(account.annualSales)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd>{account.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd>{account.email ?? "—"}</dd>
          </div>
        </dl>
        {account.operations ? <p className="mb-4 text-xs text-muted-foreground">{account.operations}</p> : null}
        <ActivityTimeline
          items={timeline}
          accountId={account.id}
          contactId={contacts[0]?.id}
          policyId={policies[0]?.policy.id}
          dealId={deals[0]?.id}
          phone={account.phone}
          email={account.email}
          templates={templates}
        />
      </RecordSection>

      <RecordSection
        id="related"
        title="Related"
        summary={`${policies.length} commercial policies · ${formatMoney(premium)}`}
      >
        <LocationsList locations={locations} />
        <CertificatesList accountId={account.id} certificates={certificates} />
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Linked people</h3>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts linked.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <RecordLink href={`/contacts/${contact.id}`}>
                    {contact.lastName}, {contact.firstName}
                  </RecordLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Commercial policies</h3>
          <RelatedPolicies rows={policies} />
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Deals</h3>
          <RelatedDeals deals={deals} />
        </div>
      </RecordSection>
    </AppShell>
  );
}
