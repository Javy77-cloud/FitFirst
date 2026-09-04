import { notFound } from "next/navigation";
import { updateContactRecord } from "@/app/actions/record-edit";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { ContactSectionNav } from "@/components/contact-section-nav";
import { ContactTimeline } from "@/components/contact-timeline";
import { LocationsList } from "@/components/desk-ams-panels";
import { RecordAskPanel } from "@/components/record-ask";
import { RecordComms } from "@/components/record-comms";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { RelatedDeals, RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
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
import { canAskTeammateOnContact, contactSectionsForRole } from "@/lib/desk/contact-sections";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, templates, asks, users, session] = await Promise.all([
    getContactWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("contact", id),
    listDeskUsers(),
    currentDeskSession(),
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
  const showAsk = canAskTeammateOnContact(session.isAdmin);
  const sections = contactSectionsForRole(session.isAdmin);
  const phone = firstFilled(contact.phone, lead?.phone);
  const email = firstFilled(contact.email, lead?.email);
  const mailing = firstFilled(contact.mailingAddress, lead?.mailingAddress, originRisk?.address1);
  const city = firstFilled(contact.city, lead?.city, originRisk?.city);
  const state = firstFilled(contact.state, lead?.state, originRisk?.state);
  const zip = firstFilled(contact.zip, lead?.zip, originRisk?.zip);
  const dob = firstFilled(contact.dateOfBirth, lead?.dateOfBirth);
  const displayName = `${contact.lastName}, ${contact.firstName}`;

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
            </dl>
            {contact.notes ? (
              <p className="mt-3 text-sm text-muted-foreground">{contact.notes}</p>
            ) : null}
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
                <Input name="mailingAddress" defaultValue={mailing} className="mt-1 h-8" />
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

          {showAsk ? (
            <RecordSection
              id="ask"
              title="Ask a teammate"
              summary="Admin only — tag from the dropdown. Hidden for agents."
              collapsible={false}
            >
              <RecordAskPanel
                entityType="contact"
                entityId={contact.id}
                asks={asks}
                users={users}
                contactId={contact.id}
                policyId={latestPolicyId}
                dealId={deals[0]?.id}
                accountId={businesses[0]?.id}
                hideWhenNotAdmin
                framed={false}
              />
            </RecordSection>
          ) : null}

          <RecordSection
            id="work"
            title="Email, SMS, calls"
            summary="Do the work from this contact. It saves onto the Timeline."
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
            />
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
