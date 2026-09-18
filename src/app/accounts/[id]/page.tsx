import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { ClientStatusPill } from "@/components/record-links";
import { getAccountWorkspace, listRecordActivities } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID, isCertifiableLine } from "@/lib/domain";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { sourceLabel } from "@/lib/crm/sources";
import { listModuleTags } from "@/app/actions/record-tags";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { BusinessDetailWorkspace } from "@/components/businesses/business-detail-workspace";
import { BusinessDetailSections } from "@/components/businesses/business-detail-sections";
import { BusinessHealthBadge } from "@/components/businesses/business-health-badge";
import { BusinessOverflowMenu } from "@/components/businesses/business-overflow-menu";
import { LinkedContactsSection } from "@/components/businesses/linked-contacts-section";
import { BusinessLocationsSection } from "@/components/businesses/business-locations-section";
import { BusinessPolicyRows } from "@/components/businesses/business-policy-rows";
import {
  coAppliesWithFromPolicy,
  formatPolicyCoApplicantName,
  namedInsuredCoApplicantContacts,
} from "@/lib/contacts/policy-co-applicants";
import { BusinessDealRows } from "@/components/businesses/business-deal-rows";
import { BusinessTimelineSection } from "@/components/businesses/business-timeline-section";
import { BusinessAtAGlanceCards } from "@/components/businesses/business-at-a-glance-cards";
import { ContactSectionBlock } from "@/components/contacts/contact-section-block";
import { RecordLayoutForm } from "@/components/custom-fields/record-layout-form";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { getAgencyBusinessSectionNav } from "@/lib/businesses/business-section-nav-prefs";
import type { BusinessSectionId } from "@/lib/desk/business-sections";

export const dynamic = "force-dynamic";

function kindMatches(kind: string, target: string) {
  return kind.toLowerCase() === target;
}

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const paramsIn = await searchParams;
  const fromPolicy = typeof paramsIn.fromPolicy === "string" ? paramsIn.fromPolicy : undefined;
  const workspace = await getAccountWorkspace(id);
  if (!workspace) notFound();
  const {
    account,
    policies,
    deals,
    contacts,
    namedInsuredById,
    policyCount,
    activePolicyCount,
    clientStatus,
    timeline,
    locations,
  } = workspace;

  const coAppCandidates = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  const [tagExtra, businessLayout, quickComms, resolvedNavIds, accountDocs] = await Promise.all([
    listModuleTags("accounts").catch(() => [] as { name: string; color: string | null }[]),
    loadModuleLayoutBundle("businesses", account.id).catch(() => null),
    listRecordActivities({ accountId: account.id }),
    getAgencyBusinessSectionNav(),
    db
      .select({
        id: documents.id,
        filename: documents.filename,
        createdAt: documents.createdAt,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, DEFAULT_TENANT_ID),
          eq(documents.accountId, account.id),
          ne(documents.status, "hidden"),
        ),
      )
      .orderBy(desc(documents.createdAt))
      .then((rows) => rows)
      .catch(() => [] as { id: string; filename: string; createdAt: Date; status: string }[]),
  ]);

  const context = await loadRecordContext({
    accountId: account.id,
    contactId: contacts[0]?.id,
    dealId: deals[0]?.id,
    policyId: policies[0]?.policy.id,
  });

  const fieldValues = mergeRecordSystemValues(
    account as unknown as Record<string, unknown>,
    businessLayout?.stored ?? {},
    businessLayout?.fields ?? [],
  );

  const lastActivityAt =
    timeline[0] && "occurredAt" in timeline[0]
      ? ((timeline[0] as { occurredAt?: Date | string }).occurredAt ?? account.updatedAt)
      : account.updatedAt;

  const emailItems = timeline
    .filter((item) => kindMatches(item.kind, "email"))
    .map((item) => ({
      id: item.id,
      title: item.subject || item.activityTitle || item.body || "Email",
      when: item.occurredAt,
      meta: item.direction ?? null,
    }));
  const smsItems = timeline
    .filter((item) => kindMatches(item.kind, "sms"))
    .map((item) => ({
      id: item.id,
      title: item.body || item.activityTitle || "SMS",
      when: item.occurredAt,
      meta: item.direction ?? null,
    }));
  const meetingItems = timeline
    .filter((item) => kindMatches(item.kind, "meeting"))
    .map((item) => ({
      id: item.id,
      title: item.activityTitle || item.body || "Meeting",
      when: item.occurredAt,
      meta: item.eventType ?? null,
    }));
  const docItems = accountDocs.map((doc) => ({
    id: doc.id,
    title: doc.filename || "Document",
    when: doc.createdAt,
    meta: doc.status,
  }));

  const noteBits = [
    account.notes ? { id: "notes", title: "Notes", meta: account.notes } : null,
    account.lifeNotes ? { id: "life-notes", title: "Life Notes", meta: account.lifeNotes } : null,
    account.healthNotes
      ? { id: "health-notes", title: "Health Notes", meta: account.healthNotes }
      : null,
    account.pcNotes ? { id: "pc-notes", title: "P&C Notes", meta: account.pcNotes } : null,
  ].filter(Boolean) as { id: string; title: string; meta: string }[];

  const sectionCounts: Partial<Record<BusinessSectionId, number>> = {
    locations: locations.length,
    policies: policies.length,
    deals: deals.length,
    timeline: timeline.length,
    emails: emailItems.length,
    sms: smsItems.length,
    meetings: meetingItems.length,
    documents: docItems.length,
    notes: noteBits.length,
  };

  const coveringPolicies = policies
    .filter((row) => row.policy.locationId)
    .map((row) => ({
      locationId: row.policy.locationId,
      policyId: row.policy.id,
      policyNumber: row.policy.policyNumber,
    }));

  return (
    <AppShell
      title="Accounts"
      recordContext={{
        accountId: account.id,
        contactId: contacts[0]?.id,
        dealId: deals[0]?.id,
        name: account.name,
        phone: account.phone,
        email: account.email,
      }}
    >
      <DeskPageTrail
        backLabel={fromPolicy ? "Back to policy" : "Back"}
        fallbackHref={fromPolicy ? `/policies/${fromPolicy}` : "/accounts"}
        crumbs={[
          { href: "/accounts", label: "Accounts" },
          ...(fromPolicy
            ? [{ href: `/policies/${fromPolicy}`, label: "Policy" }]
            : []),
          { label: "Account" },
        ]}
      />
      <div className="mb-3 space-y-1" data-ff-business-header-bar="">
        <div className="flex flex-wrap items-start gap-2">
          <div className="mt-2 shrink-0">
            <BusinessHealthBadge
              activePolicyCount={activePolicyCount}
              policyCount={policyCount}
              lastActivityAt={lastActivityAt}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold text-[#002868]">{account.name}</h2>
              <div className="flex min-w-0 flex-wrap items-center gap-2 pl-1">
                <ClientStatusPill status={clientStatus} />
                <span className="text-sm text-muted-foreground">
                  Source · {sourceLabel(account.source)}
                </span>
              </div>
              <div className="ml-auto shrink-0">
                <BusinessOverflowMenu
                  accountId={account.id}
                  accountName={account.name}
                  tags={account.tags}
                  tagExtra={tagExtra}
                />
              </div>
            </div>
            <div className="max-w-xl" data-ff-business-header-tags="">
              <AssignRecordTags
                module="accounts"
                recordId={account.id}
                tags={account.tags}
                catalog={tagExtra.map((row) => ({ name: row.name, color: row.color }))}
                appearance="addLink"
              />
            </div>
          </div>
        </div>
      </div>

      <BusinessDetailWorkspace
        rail={
          <>
            <div className="min-w-0 w-full max-w-full" data-ff-business-quick-comms="">
              <QuickCommsBoard
                items={quickComms}
                accountId={account.id}
                contactId={contacts[0]?.id}
                dealId={deals[0]?.id}
                contactName={
                  contacts[0]
                    ? `${contacts[0].firstName} ${contacts[0].lastName}`.trim()
                    : account.name
                }
                contactPhone={contacts[0]?.phone ?? account.phone}
                contactEmail={contacts[0]?.email ?? account.email}
              />
            </div>
            <RecordContextRail
              context={context}
              defaultTab="info"
              headingName={account.name}
            />
          </>
        }
      >
        <BusinessDetailSections
          selectedIds={resolvedNavIds}
          counts={sectionCounts}
          before={
            <div className="mb-3 space-y-3">
              <section
                id="at-a-glance"
                className="ff-card space-y-3 p-4 scroll-mt-14"
                data-ff-at-a-glance=""
              >
                <h2 className="text-base font-semibold text-[#002868]">At a Glance</h2>
                <BusinessAtAGlanceCards
                  accountId={account.id}
                  policies={policies.map(({ policy }) => ({
                    id: policy.id,
                    lineOfBusiness: policy.lineOfBusiness,
                    policyType: policy.policyType,
                    status: policy.status,
                    effectiveDate: policy.effectiveDate,
                    renewalDate: policy.renewalDate,
                  }))}
                  deals={deals.map((deal) => ({
                    id: deal.id,
                    title: deal.title,
                    pipelineStage: deal.pipelineStage,
                    lineOfBusiness: deal.lineOfBusiness,
                  }))}
                  activityCount={timeline.length}
                  lastActivity={
                    timeline[0]
                      ? {
                          kind: (timeline[0] as { kind?: string }).kind ?? null,
                          title:
                            (timeline[0] as { activityTitle?: string; body?: string }).activityTitle ??
                            (timeline[0] as { body?: string }).body ??
                            null,
                          occurredAt:
                            (timeline[0] as { occurredAt?: Date | string }).occurredAt ?? null,
                        }
                      : null
                  }
                  emailOptOut={false}
                  smsOptOut={false}
                />
                <LinkedContactsSection
                  accountId={account.id}
                  contacts={contacts.map((c) => ({
                    id: c.id,
                    firstName: c.firstName,
                    lastName: c.lastName,
                    email: c.email,
                  }))}
                />
              </section>

              <section
                id="business-details"
                className="ff-card space-y-3 p-3 scroll-mt-14"
                data-ff-business-details=""
                data-ff-business-inline-fields=""
              >
                <div
                  className="flex items-center justify-between gap-3"
                  data-ff-business-details-header=""
                >
                  <h2 className="text-base font-semibold text-[#002868]">Business Details</h2>
                  <div className="shrink-0" data-ff-business-edit-layout="">
                    <EditLayoutLink module="businesses" />
                  </div>
                </div>
                <RecordLayoutForm
                  module="businesses"
                  recordId={account.id}
                  layout={businessLayout?.layout ?? defaultLayoutForModule("businesses")}
                  fields={businessLayout?.fields ?? []}
                  values={fieldValues}
                  saveLabel="Save Business"
                  clickToEdit
                />
              </section>
              <RecordModuleMacros module="businesses" recordId={account.id} />
            </div>
          }
          sections={[
            {
              id: "locations",
              title: "Insured Locations",
              badge: locations.length || undefined,
              "data-ff": "business-locations",
              children: (
                <BusinessLocationsSection
                  accountId={account.id}
                  locations={locations}
                  coveringPolicies={coveringPolicies}
                />
              ),
            },
            {
              id: "policies",
              title: "Commercial Policies",
              badge: policies.length || undefined,
              "data-ff": "business-policies",
              children: (
                <BusinessPolicyRows
                  accountId={account.id}
                  policies={policies.map(({ policy, carrier, deal }) => {
                    const primaryId = policy.contactId ?? null;
                    const primary = primaryId ? namedInsuredById.get(primaryId) ?? null : null;
                    const secondaryHits = namedInsuredCoApplicantContacts({
                      primaryContactId: primaryId,
                      secondaryNamedInsured: deal?.secondaryNamedInsured ?? null,
                      candidates: coAppCandidates,
                    });
                    const fromSecondary = coAppliesWithFromPolicy({
                      excludeContactId: primaryId ?? account.id,
                      linkedContacts: secondaryHits,
                      ownsPolicies: true,
                    });
                    const coAppliesWith =
                      fromSecondary ??
                      (primary
                        ? { id: primary.id, label: formatPolicyCoApplicantName(primary) }
                        : null);
                    return {
                      id: policy.id,
                      policyNumber: policy.policyNumber,
                      status: policy.status,
                      premium: policy.premium,
                      renewalDate: policy.renewalDate,
                      expirationDate: policy.expirationDate,
                      lineOfBusiness: policy.lineOfBusiness,
                      carrierName: carrier?.name ?? null,
                      certifiable: isCertifiableLine(policy.lineOfBusiness),
                      coAppliesWith,
                    };
                  })}
                />
              ),
            },
            {
              id: "deals",
              title: "Deals",
              badge: deals.length || undefined,
              "data-ff": "business-deals",
              children: (
                <BusinessDealRows
                  accountId={account.id}
                  deals={deals.map((deal) => ({
                    id: deal.id,
                    title: deal.title,
                    pipelineStage: deal.pipelineStage,
                    coverageAmount: deal.coverageAmount,
                    lineOfBusiness: deal.lineOfBusiness,
                  }))}
                />
              ),
            },
            {
              id: "timeline",
              title: "Timeline",
              badge: timeline.length || undefined,
              "data-ff": "business-timeline",
              children: (
                <BusinessTimelineSection
                  items={timeline}
                  accountId={account.id}
                  contactId={contacts[0]?.id}
                  policyId={policies[0]?.policy.id}
                  dealId={deals[0]?.id}
                />
              ),
            },
            {
              id: "emails",
              title: "Emails",
              badge: emailItems.length || undefined,
              "data-ff": "business-section-emails",
              children: (
                <ContactSectionBlock
                  id="emails"
                  title="Emails"
                  count={emailItems.length}
                  emptyLabel="No emails yet. Use Quick Comms to log an email."
                  items={emailItems}
                  bare
                />
              ),
            },
            {
              id: "sms",
              title: "SMS",
              badge: smsItems.length || undefined,
              "data-ff": "business-section-sms",
              children: (
                <ContactSectionBlock
                  id="sms"
                  title="SMS"
                  count={smsItems.length}
                  emptyLabel="No SMS yet. Use Quick Comms to send a text."
                  items={smsItems}
                  bare
                />
              ),
            },
            {
              id: "meetings",
              title: "Meetings",
              badge: meetingItems.length || undefined,
              "data-ff": "business-section-meetings",
              children: (
                <ContactSectionBlock
                  id="meetings"
                  title="Meetings"
                  count={meetingItems.length}
                  emptyLabel="No meetings yet. Schedule from Quick Comms."
                  items={meetingItems}
                  bare
                />
              ),
            },
            {
              id: "documents",
              title: "Documents",
              badge: docItems.length || undefined,
              "data-ff": "business-section-documents",
              children: (
                <ContactSectionBlock
                  id="documents"
                  title="Documents"
                  count={docItems.length}
                  emptyLabel="No documents yet."
                  emptyCtaLabel="Upload from the desk library"
                  items={docItems}
                  bare
                />
              ),
            },
            {
              id: "notes",
              title: "Notes",
              badge: noteBits.length || undefined,
              "data-ff": "business-section-notes",
              children: (
                <ContactSectionBlock
                  id="notes"
                  title="Notes"
                  count={noteBits.length}
                  emptyLabel="No notes yet. Add notes in Business Details."
                  items={noteBits.map((n) => ({
                    id: n.id,
                    title: n.title,
                    meta: n.meta,
                  }))}
                  bare
                />
              ),
            },
          ]}
        />
      </BusinessDetailWorkspace>
    </AppShell>
  );
}
