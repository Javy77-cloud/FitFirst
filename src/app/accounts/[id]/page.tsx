import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { CertificatesList, LocationsList } from "@/components/desk-ams-panels";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { formatMoney } from "@/lib/domain";
import { getAccountWorkspace } from "@/lib/db/queries";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { loadRecordContext } from "@/lib/record-context";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getAccountWorkspace(id);
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
  const context = await loadRecordContext({
    accountId: account.id,
    contactId: contacts[0]?.id,
    dealId: deals[0]?.id,
    policyId: policies[0]?.policy.id,
  });

  return (
    <AppShell title={account.name}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime policies <strong>{policyCount}</strong>
        </span>
        <span>
          Active / bound / pending <strong>{activePolicyCount}</strong>
        </span>
      </div>
      <RecordDetailLayout
        main={
          <div>
      <section className="ff-card mb-4 p-4 text-sm">
        <h2 className="text-base font-semibold text-navy">Account 360 · commercial profile</h2>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">EIN / FEIN</dt>
            <dd>{account.ein ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Entity</dt>
            <dd>{account.entityType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Employees</dt>
            <dd>{account.employeeCount ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Annual sales</dt>
            <dd>{formatMoney(account.annualSales)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">W-2 payroll</dt>
            <dd>{formatMoney(account.payrollW2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">1099 / subcontracted</dt>
            <dd>{formatMoney(account.payroll1099)}</dd>
          </div>
        </dl>
        {account.operations ? (
          <p className="mt-3 text-base text-muted-foreground">{account.operations}</p>
        ) : null}
      </section>
      <section className="ff-card mb-4 p-4 text-sm">
        <h2 className="text-base font-semibold text-navy">Linked people</h2>
        {contacts.length === 0 ? (
          <p className="mt-2 text-base text-muted-foreground">No contacts linked.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <RecordLink href={`/contacts/${contact.id}`}>
                  {contact.lastName}, {contact.firstName}
                </RecordLink>
                <span className="ml-2 text-base text-muted-foreground">
                  personal policies stay on the contact
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <LocationsList locations={locations} />
      <CertificatesList accountId={account.id} certificates={certificates} />

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Commercial policies
        </div>
        {policies.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No commercial policies. This account is not a client until a bound/pending/active
            policy is attached here.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Status</th>
                <th>Carrier</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(({ policy, carrier }) => (
                <tr key={policy.id}>
                  <td>
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  </td>
                  <td>
                    <PolicyStatusBadge status={policy.status} />
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <div className="mb-4">
        <ActivityTimeline
          items={timeline}
          accountId={account.id}
          contactId={contacts[0]?.id}
          policyId={policies[0]?.policy.id}
          dealId={deals[0]?.id}
        />
      </div>
      {deals.length > 0 ? (
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
            Deals
          </div>
          <ul className="divide-y divide-border">
            {deals.map((deal) => (
              <li key={deal.id} className="px-4 py-2 text-sm">
                <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
          </div>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
