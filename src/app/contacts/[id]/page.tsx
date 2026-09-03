import { notFound } from "next/navigation";
import { updateContactRecord } from "@/app/actions/record-edit";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { LocationsList } from "@/components/desk-ams-panels";
import { RecordAskPanel } from "@/components/record-ask";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RelatedDeals, RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  getContactWorkspace,
  listEmailTemplates,
  listRecordAsks,
  sumCommissionsForPolicies,
} from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { toNumber } from "@/lib/commissions/math";
import { firstFilled } from "@/lib/desk/copy-once";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, templates, asks, users] = await Promise.all([
    getContactWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("contact", id),
    listDeskUsers(),
  ]);
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
    lead,
    originRisk,
  } = workspace;
  const latestPolicyId = policies[0]?.policy.id ?? null;
  const premium = policies.reduce((sum, row) => sum + toNumber(row.policy.premium), 0);
  const commission = await sumCommissionsForPolicies(policies.map((row) => row.policy.id));

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
        <form action={updateContactRecord} className="mb-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="contactId" value={contact.id} />
          <div>
            <Label className="text-xs">First</Label>
            <Input name="firstName" defaultValue={contact.firstName} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Last</Label>
            <Input name="lastName" defaultValue={contact.lastName} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" defaultValue={firstFilled(contact.phone, lead?.phone)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input name="email" defaultValue={firstFilled(contact.email, lead?.email)} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Mailing (copied from lead / deal — do not retype)</Label>
            <Input
              name="mailingAddress"
              defaultValue={firstFilled(contact.mailingAddress, lead?.mailingAddress, originRisk?.address1)}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input name="city" defaultValue={firstFilled(contact.city, lead?.city, originRisk?.city)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input name="state" defaultValue={firstFilled(contact.state, lead?.state, originRisk?.state)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">ZIP</Label>
            <Input name="zip" defaultValue={firstFilled(contact.zip, lead?.zip, originRisk?.zip)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Date of birth</Label>
            <Input name="dateOfBirth" defaultValue={firstFilled(contact.dateOfBirth, lead?.dateOfBirth)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Tenure</Label>
            <div className="mt-1 text-sm">{formatDay(contact.tenureStart)}</div>
          </div>
          <Button type="submit" size="sm">
            Save contact
          </Button>
        </form>
        <RecordAskPanel
          entityType="contact"
          entityId={contact.id}
          asks={asks}
          users={users}
          contactId={contact.id}
          policyId={latestPolicyId}
          dealId={deals[0]?.id}
          accountId={businesses[0]?.id}
        />
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
        summary={`${policies.length} policies · ${formatMoney(premium)} premium · ${formatMoney(commission)} commission`}
      >
        <RelatedRollups premium={premium} commission={commission} />
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
