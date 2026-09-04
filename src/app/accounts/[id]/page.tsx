import { notFound } from "next/navigation";
import { updateAccountRecord } from "@/app/actions/record-edit";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { CertificatesList, LocationsList } from "@/components/desk-ams-panels";
import { ClickToCall } from "@/components/click-to-call";
import { RecordAskPanel } from "@/components/record-ask";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RelatedDeals, RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/domain";
import {
  getAccountWorkspace,
  listEmailTemplates,
  listRecordAsks,
  sumCommissionsForPolicies,
} from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { toNumber } from "@/lib/commissions/math";
import { firstFilled } from "@/lib/desk/copy-once";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, templates, asks, users] = await Promise.all([
    getAccountWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("account", id),
    listDeskUsers(),
  ]);
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
    originRisk,
  } = workspace;
  const premium = policies.reduce((sum, row) => sum + toNumber(row.policy.premium), 0);
  const commission = await sumCommissionsForPolicies(policies.map((row) => row.policy.id));

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
        <ClickToCall
          entityType="account"
          entityId={account.id}
          name={account.name}
          phone={account.phone}
        />
      </div>

      <RecordSection id="record" title="This business" summary={`${account.ein ?? "No EIN"} · comms stay on this record`}>
        <form action={updateAccountRecord} className="mb-4 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="accountId" value={account.id} />
          <div className="sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input name="name" defaultValue={account.name} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">EIN / FEIN</Label>
            <Input name="ein" defaultValue={account.ein ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" defaultValue={account.phone ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input name="email" defaultValue={account.email ?? ""} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">Mailing (copied from the deal — do not retype)</Label>
            <Input
              name="mailingAddress"
              defaultValue={firstFilled(account.mailingAddress, originRisk?.address1)}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input name="city" defaultValue={firstFilled(account.city, originRisk?.city)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input name="state" defaultValue={firstFilled(account.state, originRisk?.state)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">ZIP</Label>
            <Input name="zip" defaultValue={firstFilled(account.zip, originRisk?.zip)} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-3 text-xs text-muted-foreground">
            Entity {account.entityType ?? "—"} · Employees {account.employeeCount ?? "—"} · Sales{" "}
            {formatMoney(account.annualSales)}
          </div>
          <Button type="submit" size="sm">
            Save business
          </Button>
        </form>
        {account.operations ? <p className="mb-4 text-xs text-muted-foreground">{account.operations}</p> : null}
        <RecordAskPanel
          entityType="account"
          entityId={account.id}
          asks={asks}
          users={users}
          accountId={account.id}
          contactId={contacts[0]?.id}
          policyId={policies[0]?.policy.id}
          dealId={deals[0]?.id}
        />
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
        summary={`${policies.length} commercial policies · ${formatMoney(premium)} premium · ${formatMoney(commission)} commission`}
      >
        <RelatedRollups premium={premium} commission={commission} />
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
