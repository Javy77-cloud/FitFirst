import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { LocationsList } from "@/components/desk-ams-panels";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RelatedDeals, RelatedPolicies } from "@/components/related-tables";
import { formatDay, formatMoney } from "@/lib/domain";
import { getContactWorkspace, listEmailTemplates } from "@/lib/db/queries";
import { toNumber } from "@/lib/commissions/math";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, templates] = await Promise.all([getContactWorkspace(id), listEmailTemplates()]);
  if (!workspace) notFound();
  const {
    contact,
    policies,
    deals,
    businesses,
    policyCount,
    activePolicyCount,
    clientStatus,
    timeline,
    locations,
  } = workspace;
  const latestPolicyId = policies[0]?.policy.id ?? null;
  const premium = policies.reduce((sum, row) => sum + toNumber(row.policy.premium), 0);

  return (
    <AppShell title={`${contact.lastName}, ${contact.firstName}`}>
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Contact record</p>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime policies <strong>{policyCount}</strong>
        </span>
        <span>
          In-force <strong>{activePolicyCount}</strong>
        </span>
      </div>

      <RecordSection
        id="record"
        title="This contact"
        summary={`${contact.phone ?? contact.email ?? "No phone or email"} · edit and comms stay here`}
      >
        <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Mailing</dt>
            <dd>{contact.mailingAddress ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">City</dt>
            <dd>{[contact.city, contact.state, contact.zip].filter(Boolean).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tenure</dt>
            <dd>{formatDay(contact.tenureStart)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Life / health notes</dt>
            <dd>{[contact.lifeNotes, contact.healthNotes].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
        </dl>
        <ActivityTimeline
          items={timeline}
          contactId={contact.id}
          policyId={latestPolicyId}
          dealId={deals[0]?.id}
          accountId={businesses[0]?.id}
          phone={contact.phone}
          email={contact.email}
          templates={templates}
        />
      </RecordSection>

      <RecordSection
        id="related"
        title="Related"
        summary={`${policies.length} policies · ${formatMoney(premium)} premium · ${deals.length} deals`}
      >
        <LocationsList locations={locations} />
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Policies</h3>
          <RelatedPolicies rows={policies} />
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Deals</h3>
          <RelatedDeals deals={deals} />
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Linked businesses</h3>
          {businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No business link.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {businesses.map((account) => (
                <li key={account.id}>
                  <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </RecordSection>
    </AppShell>
  );
}
