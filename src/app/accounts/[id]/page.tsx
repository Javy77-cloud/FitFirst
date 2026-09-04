import { notFound } from "next/navigation";
import { updateAccountRecord } from "@/app/actions/record-edit";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { CertificatesList, LocationsList } from "@/components/desk-ams-panels";
import { RecordAskPanel } from "@/components/record-ask";
import { RecordAutoTimeline } from "@/components/record-auto-timeline";
import { RecordComms } from "@/components/record-comms";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RecordSectionNav } from "@/components/record-section-nav";
import { GapPanel } from "@/components/coverage/gap-panel";
import { RelatedDeals, RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { AddressAutofill } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  getAccountWorkspace,
  listEmailTemplates,
  listRecordAsks,
  sumCommissionsForPolicies,
} from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { toNumber } from "@/lib/commissions/math";
import { firstFilled } from "@/lib/desk/copy-once";
import { businessSectionsForRole, canAskTeammateOnBusiness } from "@/lib/desk/business-sections";
import { analyzeCoverageGaps } from "@/lib/coverage/gaps";
import { isUuid } from "@/lib/ids";
import { einMaskFromRow } from "@/lib/pii/vault";
import { MaskedPiiField } from "@/components/pii/masked-field";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, templates, asks, users, session] = await Promise.all([
    getAccountWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("account", id),
    listDeskUsers(),
    currentDeskSession(),
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
  const showAsk = canAskTeammateOnBusiness(session.isAdmin);
  const sections = businessSectionsForRole(session.isAdmin);
  const phone = firstFilled(account.phone);
  const email = firstFilled(account.email);
  const mailing = firstFilled(account.mailingAddress, originRisk?.address1);
  const city = firstFilled(account.city, originRisk?.city);
  const state = firstFilled(account.state, originRisk?.state);
  const zip = firstFilled(account.zip, originRisk?.zip);
  const latestPolicyId = policies[0]?.policy.id ?? null;
  const gapReport = analyzeCoverageGaps({
    policies: policies.map((row) => row.policy),
    partyName: account.name,
    quoteCount: 0,
  });

  return (
    <AppShell title={account.name} eyebrow="Business record">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime policies <strong>{policyCount}</strong>
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

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <RecordSectionNav sections={sections} ariaLabel="Business sections" />
        <div className="min-w-0">
          <RecordSection
            id="overview"
            title="Overview"
            summary={`${phone || email || einMaskFromRow(account) || "No phone, email, or EIN"} · status from policies, not a stored flag`}
            collapsible={false}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Legal name</dt>
                <dd className="font-medium text-navy">{account.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Client status</dt>
                <dd>
                  <ClientStatusPill status={clientStatus} />
                </dd>
              </div>
              {account.dba ? (
                <div>
                  <dt className="text-xs text-muted-foreground">DBA</dt>
                  <dd>{account.dba}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">EIN / FEIN</dt>
                <dd>
                  <MaskedPiiField
                    entityType="account"
                    entityId={account.id}
                    field="ein"
                    mask={einMaskFromRow(account)}
                    canReveal={session.isAdmin || session.isAgent}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Lifetime / in-force</dt>
                <dd>
                  {policyCount} / {activePolicyCount}
                </dd>
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
                <dt className="text-xs text-muted-foreground">W-2 / 1099 payroll</dt>
                <dd>
                  {formatMoney(account.payrollW2)} / {formatMoney(account.payroll1099)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tenure</dt>
                <dd>{formatDay(account.tenureStart)}</dd>
              </div>
            </dl>
            {account.operations ? (
              <p className="mt-3 text-sm text-muted-foreground">{account.operations}</p>
            ) : null}
            {account.notes ? (
              <p className="mt-2 text-sm text-muted-foreground">{account.notes}</p>
            ) : null}
          </RecordSection>

          <RecordSection
            id="gaps"
            title="Coverage gaps"
            summary="In-force commercial lines only. Quotes do not count."
            collapsible={false}
          >
            <GapPanel report={gapReport} />
          </RecordSection>

          <RecordSection
            id="information"
            title="Business information"
            summary="Edit fields already on this business. Save does not blank what the desk has."
            collapsible={false}
          >
            <form action={updateAccountRecord} className="grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="accountId" value={account.id} />
              <div className="sm:col-span-2">
                <Label className="text-xs">Name</Label>
                <Input name="name" defaultValue={account.name} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">EIN / FEIN</Label>
                <Input
                  name="ein"
                  defaultValue=""
                  placeholder={einMaskFromRow(account) ?? "Replace EIN"}
                  autoComplete="off"
                  className="mt-1 h-8"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Stored encrypted. Leave blank to keep {einMaskFromRow(account) ?? "empty"}.
                </p>
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input name="phone" defaultValue={phone} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input name="email" defaultValue={email} className="mt-1 h-8" />
              </div>
              <div className="sm:col-span-3 text-xs text-muted-foreground">
                Entity {account.entityType ?? "—"} · Employees {account.employeeCount ?? "—"} · Sales{" "}
                {formatMoney(account.annualSales)}
              </div>
              <Button type="submit" size="sm">
                Save business
              </Button>
            </form>
          </RecordSection>

          <RecordSection
            id="address"
            title="Address"
            summary="Mailing copied from the deal — do not retype"
            collapsible={false}
          >
            <form action={updateAccountRecord} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="accountId" value={account.id} />
              <div className="sm:col-span-2">
                <Label className="text-xs">Mailing</Label>
                <AddressAutofill name="mailingAddress" defaultValue={mailing} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input name="city" defaultValue={city} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input name="state" defaultValue={state} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input name="zip" defaultValue={zip} className="mt-1 h-8" />
              </div>
              <Button type="submit" size="sm">
                Save address
              </Button>
            </form>
          </RecordSection>

          <RecordSection
            id="policies"
            title="Policies"
            summary={`${policies.length} commercial policies · ${formatMoney(premium)} premium · ${formatMoney(commission)} commission`}
            collapsible={false}
          >
            <RelatedRollups premium={premium} commission={commission} />
            <RelatedPolicies rows={policies} />
          </RecordSection>

          <RecordSection
            id="deals"
            title="Deals"
            summary={`${deals.length} linked shops`}
            collapsible={false}
          >
            <RelatedDeals deals={deals} />
          </RecordSection>

          <RecordSection
            id="people"
            title="People"
            summary={contacts.length === 0 ? "No contacts linked" : `${contacts.length} linked`}
            collapsible={false}
          >
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
          </RecordSection>

          <RecordSection
            id="locations"
            title="Locations"
            summary={`${locations.length} insured premises`}
            collapsible={false}
          >
            <LocationsList locations={locations} framed={false} />
          </RecordSection>

          <RecordSection
            id="certificates"
            title="Certificates"
            summary={
              certificates.length === 0
                ? "No COI stub on this Business"
                : `${certificates.length} certificate stub${certificates.length === 1 ? "" : "s"}`
            }
            collapsible={false}
          >
            <CertificatesList accountId={account.id} certificates={certificates} framed={false} />
          </RecordSection>

          {showAsk ? (
            <RecordSection
              id="ask"
              title="Ask a teammate"
              summary="Admin only — tag from the dropdown. Hidden for agents."
              collapsible={false}
            >
              <RecordAskPanel
                entityType="account"
                entityId={account.id}
                asks={asks}
                users={users}
                accountId={account.id}
                contactId={contacts[0]?.id}
                policyId={latestPolicyId}
                dealId={deals[0]?.id}
                hideWhenNotAdmin
                framed={false}
              />
            </RecordSection>
          ) : null}

          <RecordSection
            id="work"
            title="Email, SMS, calls"
            summary="Do the work from this business. It saves onto the Timeline."
            collapsible={false}
          >
            <RecordComms
              contactId={contacts[0]?.id}
              accountId={account.id}
              policyId={latestPolicyId}
              dealId={deals[0]?.id}
              phone={account.phone}
              email={account.email}
              templates={templates}
              autoSaveHint
            />
          </RecordSection>

          <RecordSection
            id="timeline"
            title="Timeline"
            summary="Platform actions with this business — no typed log"
            collapsible={false}
          >
            <RecordAutoTimeline items={timeline} />
          </RecordSection>
        </div>
      </div>
    </AppShell>
  );
}
