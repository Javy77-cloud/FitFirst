import { notFound } from "next/navigation";
import { updateContactRecord } from "@/app/actions/record-edit";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { ContactSectionNav } from "@/components/contact-section-nav";
import { ContactTimeline } from "@/components/contact-timeline";
import { LocationsList } from "@/components/desk-ams-panels";
import { RecordComms } from "@/components/record-comms";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { AccountClaimsPanel } from "@/components/claims/account-panel";
import { GapPanel } from "@/components/coverage/gap-panel";
import { RelatedDeals, RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { AddressAutofill } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatMoney } from "@/lib/domain";
import { listClaimsForContact } from "@/lib/db/claim-queries";
import {
  getContactWorkspace,
  listEmailTemplates,
  sumCommissionsForPolicies,
} from "@/lib/db/queries";
import { toNumber } from "@/lib/commissions/math";
import { firstFilled } from "@/lib/desk/copy-once";
import { contactSectionsForRole } from "@/lib/desk/contact-sections";
import { analyzeCoverageGaps } from "@/lib/coverage/gaps";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { isUuid } from "@/lib/ids";
import { currentDeskSession } from "@/lib/auth/session";
import { ssnMaskFromRow } from "@/lib/pii/vault";
import { MaskedPiiField } from "@/components/pii/masked-field";
import { RenewalRiskCard } from "@/components/renewal-risk/risk-card";
import { loadRenewalRiskForContact } from "@/lib/renewal-risk/load";
import { PortalLinkCard } from "@/components/desk/portal-link-card";
import { findPortalTokenFor } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, templates, session, claimRows, renewalRisk] = await Promise.all([
    getContactWorkspace(id),
    listEmailTemplates(),
    currentDeskSession(),
    listClaimsForContact(id),
    loadRenewalRiskForContact(id),
  ]);
  const portalToken = await findPortalTokenFor({ contactId: id });
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
  const sections = contactSectionsForRole(false);
  const phone = firstFilled(contact.phone, lead?.phone);
  const email = firstFilled(contact.email, lead?.email);
  const mailing = firstFilled(contact.mailingAddress, lead?.mailingAddress, originRisk?.address1);
  const city = firstFilled(contact.city, lead?.city, originRisk?.city);
  const state = firstFilled(contact.state, lead?.state, originRisk?.state);
  const zip = firstFilled(contact.zip, lead?.zip, originRisk?.zip);
  const dob = firstFilled(contact.dateOfBirth, lead?.dateOfBirth);
  const displayName = `${contact.lastName}, ${contact.firstName}`;
  const gapReport = analyzeCoverageGaps({
    policies: policies.map((row) => row.policy),
    partyName: displayName,
    isAna: contact.id === CONTACT_ID,
    quoteCount: 0,
  });

  return (
    <AppShell title={displayName} eyebrow="Contact record">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <ClientStatusPill status={clientStatus} />
        <span>
          Lifetime policies <strong>{policyCount}</strong>
        </span>
        <span>
          In-force <strong>{activePolicyCount}</strong>
        </span>
        <ClickToCall
          entityType="contact"
          entityId={contact.id}
          name={`${contact.firstName} ${contact.lastName}`}
          phone={contact.phone}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <ContactSectionNav sections={sections} />
        <div className="min-w-0">
          <RecordSection
            id="overview"
            title="Overview"
            summary={`${phone || email || "No phone or email"} · status from policies, not a stored flag`}
            collapsible={false}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium text-navy">
                  {contact.firstName} {contact.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Client status</dt>
                <dd>
                  <ClientStatusPill status={clientStatus} />
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
                <dt className="text-xs text-muted-foreground">SSN</dt>
                <dd>
                  <MaskedPiiField
                    entityType="contact"
                    entityId={contact.id}
                    field="ssn"
                    mask={ssnMaskFromRow(contact)}
                    canReveal={session.isAdmin || session.userId === contact.ownerId || (!contact.ownerId && session.signedIn)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Lifetime / in-force</dt>
                <dd>
                  {policyCount} / {activePolicyCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tenure</dt>
                <dd>{formatDay(contact.tenureStart)}</dd>
              </div>
              {contact.language ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Language</dt>
                  <dd>{contact.language}</dd>
                </div>
              ) : null}
              {contact.maritalStatus ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Marital status</dt>
                  <dd>{contact.maritalStatus}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">Email opt-out</dt>
                <dd>{contact.emailOptOut ? `Yes${contact.emailOptedOutAt ? ` · ${formatDay(contact.emailOptedOutAt)}` : ""}` : "No"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SMS opt-out</dt>
                <dd>{contact.smsOptOut ? `Yes${contact.smsOptedOutAt ? ` · ${formatDay(contact.smsOptedOutAt)}` : ""}` : "No"}</dd>
              </div>
            </dl>
            {contact.notes ? (
              <p className="mt-3 text-sm text-muted-foreground">{contact.notes}</p>
            ) : null}
            {renewalRisk ? (
              <div className="mt-4">
                <RenewalRiskCard row={renewalRisk} />
              </div>
            ) : policyCount === 0 ? (
              <p className="mt-3 text-[12px] text-muted-foreground">
                No in-force policies — no renewal-risk score. Shopping stays unbound.
              </p>
            ) : null}
          </RecordSection>

          <RecordSection
            id="gaps"
            title="Coverage gaps"
            summary="In-force only. Quotes on a shop do not count as coverage."
            collapsible={false}
          >
            <GapPanel report={gapReport} />
          </RecordSection>

          <RecordSection
            id="information"
            title="Contact information"
            summary="Edit fields already on this person. Save does not blank what the desk has."
            collapsible={false}
          >
            <form action={updateContactRecord} className="grid gap-2 sm:grid-cols-2">
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
                <Input name="phone" defaultValue={phone} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input name="email" defaultValue={email} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Date of birth</Label>
                <Input name="dateOfBirth" defaultValue={dob} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">SSN</Label>
                <Input
                  name="ssn"
                  defaultValue=""
                  placeholder={ssnMaskFromRow(contact) ?? "000-00-0000"}
                  autoComplete="off"
                  className="mt-1 h-8"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Encrypted at rest. Leave blank to keep {ssnMaskFromRow(contact) ?? "empty"}.
                </p>
              </div>
              <div>
                <Label className="text-xs">Tenure</Label>
                <div className="mt-1 text-sm">{formatDay(contact.tenureStart)}</div>
              </div>
              <Button type="submit" size="sm">
                Save contact
              </Button>
            </form>
          </RecordSection>

          <RecordSection
            id="address"
            title="Address"
            summary="Mailing copied from lead / deal — do not retype"
            collapsible={false}
          >
            <form action={updateContactRecord} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="contactId" value={contact.id} />
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
            summary={`${policies.length} policies · ${formatMoney(premium)} premium · ${formatMoney(commission)} commission`}
            collapsible={false}
          >
            <RelatedRollups premium={premium} commission={commission} />
            <RelatedPolicies rows={policies} />
            {portalToken ? (
              <div className="mt-4">
                <PortalLinkCard token={portalToken.token} label={portalToken.label} />
              </div>
            ) : null}
          </RecordSection>

          <RecordSection
            id="claims"
            title="Claims"
            summary="FNOL desk log linked to this Contact and their policies"
            collapsible={false}
          >
            <AccountClaimsPanel
              contactName={displayName}
              contactId={contact.id}
              rows={claimRows.map(({ claim, policy, contact: party }) => ({
                id: claim.id,
                status: claim.status,
                causeType: claim.causeType ?? "other",
                description: claim.description,
                reportedHow: claim.reportedHow ?? "phone",
                dateReported: claim.dateReported ?? claim.createdAt,
                dateOfLoss: claim.dateOfLoss,
                carrierClaimNumber: claim.carrierClaimNumber,
                policyId: claim.policyId ?? policy?.id ?? null,
                policyNumber: policy?.policyNumber,
                contactId: claim.contactId ?? party?.id ?? contact.id,
                contactName: party ? `${party.lastName}, ${party.firstName}` : displayName,
              }))}
            />
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
            id="businesses"
            title="Businesses"
            summary={businesses.length === 0 ? "No business link" : `${businesses.length} linked`}
            collapsible={false}
          >
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
            id="work"
            title="Email, SMS, calls"
            summary="Call, email, or text from this contact. Timeline fills when the desk sends or receives."
            collapsible={false}
          >
            <RecordComms
              contactId={contact.id}
              policyId={latestPolicyId}
              dealId={deals[0]?.id}
              accountId={businesses[0]?.id}
              phone={contact.phone}
              email={contact.email}
              templates={templates}
              autoSaveHint
              hideManualLogs
              emailOptOut={contact.emailOptOut}
              smsOptOut={contact.smsOptOut}
            />
          </RecordSection>

          <RecordSection
            id="optouts"
            title="Opt-outs"
            summary="SMS and email opt-out tracking on this contact"
            collapsible={false}
          >
            <form action={updateContactRecord} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="contactId" value={contact.id} />
              <input type="hidden" name="saveOptOuts" value="1" />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="emailOptOut"
                  defaultChecked={contact.emailOptOut}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-navy">Email opt-out</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {contact.emailOptOut
                      ? `Recorded ${formatDay(contact.emailOptedOutAt)}`
                      : "Not opted out. Check to stop desk email."}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="smsOptOut"
                  defaultChecked={contact.smsOptOut}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-navy">SMS opt-out</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {contact.smsOptOut
                      ? `Recorded ${formatDay(contact.smsOptedOutAt)}`
                      : "Not opted out. Check to stop desk texts."}
                  </span>
                </span>
              </label>
              <Button type="submit" size="sm">
                Save opt-outs
              </Button>
            </form>
          </RecordSection>

          <RecordSection
            id="timeline"
            title="Timeline"
            summary="Platform actions with this contact — no typed log"
            collapsible={false}
          >
            <ContactTimeline items={timeline} />
          </RecordSection>
        </div>
      </div>
    </AppShell>
  );
}
