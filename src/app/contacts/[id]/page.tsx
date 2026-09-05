import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { LocationsList } from "@/components/desk-ams-panels";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { getContactWorkspace, listEmailTemplates } from "@/lib/db/queries";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { loadRecordContext } from "@/lib/record-context";
import { AccountGlance } from "@/components/crm/account-glance";
import { OptOutForm } from "@/components/crm/opt-out-form";
import { SourceSelect } from "@/components/crm/source-select";
import { RecordComms } from "@/components/record-comms";
import { updateContactRecord } from "@/app/actions/record-edit";
import { sourceLabel } from "@/lib/crm/sources";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getContactWorkspace(id);
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
  const templates = await listEmailTemplates();
  const context = await loadRecordContext({
    contactId: contact.id,
    accountId: businesses[0]?.id,
    dealId: deals[0]?.id,
    policyId: latestPolicyId,
  });

  return (
    <AppShell title={`${contact.lastName}, ${contact.firstName}`}>
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Account 360</p>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime policies <strong>{policyCount}</strong>
        </span>
        <span>
          Active / bound / pending <strong>{activePolicyCount}</strong>
        </span>
        <span className="text-muted-foreground">
          {contact.phone ?? contact.email ?? "No phone or email"}
        </span>
        <span className="text-muted-foreground">Source · {sourceLabel(contact.source)}</span>
      </div>

      <RecordDetailLayout
        main={
          <div>
      <AccountGlance
        policyCount={policyCount}
        activePolicyCount={activePolicyCount}
        dealCount={deals.length}
        activityCount={timeline.length}
        emailOptOut={contact.emailOptOut}
        smsOptOut={contact.smsOptOut}
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4 text-sm">
          <h2 className="text-base font-semibold text-navy">Copied at bind</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Personal-lines fields come from the lead and risk so the agent does not retype.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Mailing</dt>
              <dd>{contact.mailingAddress ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">City</dt>
              <dd>
                {[contact.city, contact.state, contact.zip].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tenure</dt>
              <dd>{formatDay(contact.tenureStart)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Life / health</dt>
              <dd>{[contact.lifeNotes, contact.healthNotes].filter(Boolean).join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{sourceLabel(contact.source)}</dd>
            </div>
          </dl>
          <form action={updateContactRecord} className="mt-3 max-w-xs space-y-2">
            <input type="hidden" name="contactId" value={contact.id} />
            <SourceSelect defaultValue={contact.source} allowEmpty emptyLabel="No source" />
            <Button type="submit" size="sm" variant="outline">
              Save source
            </Button>
          </form>
        </section>
        <section className="ff-card p-4 text-sm">
          <h2 className="text-base font-semibold text-navy">Linked businesses</h2>
          <p className="mt-1 text-base text-muted-foreground">
            The same person can hold personal policies here and be linked to a commercial account.
          </p>
          {businesses.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">No business link.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {businesses.map((account) => (
                <li key={account.id}>
                  <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <LocationsList locations={locations} />

      <section id="work" className="ff-card mb-4 p-4">
        <h2 className="text-base font-semibold text-navy">Email, SMS, calls</h2>
        <p className="mt-1 mb-3 text-helper text-muted-foreground">
          Queue outbound intent here. Nothing sends until a vendor is plugged in later.
        </p>
        <RecordComms
          contactId={contact.id}
          dealId={deals[0]?.id}
          policyId={latestPolicyId}
          accountId={businesses[0]?.id}
          phone={contact.phone}
          email={contact.email}
          templates={templates}
          emailOptOut={contact.emailOptOut}
          smsOptOut={contact.smsOptOut}
        />
      </section>

      <OptOutForm
        contactId={contact.id}
        emailOptOut={contact.emailOptOut}
        smsOptOut={contact.smsOptOut}
      />

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Policies
        </div>
        {policies.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No policies. Quotes on a deal do not create a policy.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Status</th>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Deal</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(({ policy, carrier, deal }) => (
                <tr key={policy.id}>
                  <td>
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  </td>
                  <td>
                    <PolicyStatusBadge status={policy.status} />
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                  <td>
                    {deal ? <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="mb-4">
        <ActivityTimeline
          items={timeline}
          contactId={contact.id}
          policyId={latestPolicyId}
          dealId={deals[0]?.id}
          accountId={businesses[0]?.id}
        />
      </div>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">Deals</div>
        {deals.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No deals linked.</p>
        ) : (
          <ul className="divide-y divide-border">
            {deals.map((deal) => (
              <li key={deal.id} className="px-4 py-2 text-sm">
                <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
                <span className="ml-2 text-xs uppercase text-muted-foreground">
                  {deal.pipelineStage}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
          </div>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
