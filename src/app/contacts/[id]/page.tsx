import { notFound } from "next/navigation";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { ClientStatusPill } from "@/components/record-links";
import { getContactWorkspace, listRecordActivities } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { agencySettings, contacts, documents } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { sourceLabel } from "@/lib/crm/sources";
import { listModuleTags } from "@/app/actions/record-tags";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { ContactDetailWorkspace } from "@/components/contacts/contact-detail-workspace";
import { ContactDetailSections } from "@/components/contacts/contact-detail-sections";
import { ClientStatusDot } from "@/components/contacts/client-status-dot";
import { ContactOverflowMenu } from "@/components/contacts/contact-overflow-menu";
import { LinkedBusinessLine } from "@/components/contacts/linked-business-line";
import { RecordLayoutForm } from "@/components/custom-fields/record-layout-form";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { ContactPolicyRows } from "@/components/contacts/contact-policy-rows";
import { ContactDealRows } from "@/components/contacts/contact-deal-rows";
import { ContactTimelineSection } from "@/components/contacts/contact-timeline-section";
import { ContactSectionBlock } from "@/components/contacts/contact-section-block";
import { ContactAtAGlanceCards } from "@/components/contacts/contact-at-a-glance-cards";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { softEmailPhoneDups } from "@/lib/contacts/soft-dup";
import { buildPolicyCoApplicantLinks } from "@/lib/contacts/policy-co-applicants";
import { getAgencyContactSectionNav } from "@/lib/contacts/contact-section-nav-prefs";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";
import type { ContactSectionId } from "@/lib/desk/contact-sections";

export const dynamic = "force-dynamic";

function kindMatches(kind: string, target: string) {
  return kind.toLowerCase() === target;
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const paramsIn = await searchParams;
  const fromPolicy = typeof paramsIn.fromPolicy === "string" ? paramsIn.fromPolicy : undefined;
  const workspace = await getContactWorkspace(id);
  if (!workspace) notFound();
  const {
    contact,
    policies,
    deals,
    businesses,
    coApplicants,
    lead,
    originRisk,
    clientStatus,
    timeline,
  } = workspace;
  const latestPolicyId = policies[0]?.policy.id ?? null;

  const [tagExtra, contactLayout, book, comms, agencyRow, resolvedNavIds, contactDocs] =
    await Promise.all([
      listModuleTags("contacts").catch(() => [] as { name: string; color: string | null }[]),
      loadModuleLayoutBundle("contacts", contact.id).catch(() => null),
      db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, DEFAULT_TENANT_ID),
            isNull(contacts.archivedAt),
            isNull(contacts.mergedIntoId),
            ne(contacts.id, contact.id),
          ),
        ),
      listRecordActivities({ contactId: contact.id }),
      db
        .select({
          agencyName: agencySettings.agencyName,
          officeAddress: agencySettings.officeAddress,
        })
        .from(agencySettings)
        .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
        .limit(1)
        .then((rows) => rows[0] ?? null)
        .catch(() => null),
      getAgencyContactSectionNav(),
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
            eq(documents.contactId, contact.id),
            ne(documents.status, "hidden"),
          ),
        )
        .orderBy(desc(documents.createdAt))
        .then((rows) => rows)
        .catch(() => [] as { id: string; filename: string; createdAt: Date; status: string }[]),
    ]);

  const dups = softEmailPhoneDups(book, contact);
  const context = await loadRecordContext({
    contactId: contact.id,
    accountId: businesses[0]?.id,
    dealId: deals[0]?.id,
    policyId: latestPolicyId,
  });

  const fieldValues = mergeRecordSystemValues(
    contact as unknown as Record<string, unknown>,
    contactLayout?.stored ?? {},
    contactLayout?.fields ?? [],
  );

  const optedOut = contact.emailOptOut || contact.smsOptOut;
  const partyName = `${contact.firstName} ${contact.lastName}`.trim();
  const clientAddress = homeAddressFromRecords({ risk: originRisk, lead, contact });
  const officeAddress = officeMeetingAddress({
    agencyName: agencyRow?.agencyName,
    officeAddress: agencyRow?.officeAddress,
  });

  // Policy reverse-lookup only — no Contact co-app M2M UI.
  const coApplicantLinks = buildPolicyCoApplicantLinks({
    contactId: contact.id,
    linkedContacts: coApplicants.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
    })),
    ownsPolicies: policies.length > 0,
  });

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
  const docItems = contactDocs.map((doc) => ({
    id: doc.id,
    title: doc.filename || "Document",
    when: doc.createdAt,
    meta: doc.status,
  }));

  const pcNotes =
    typeof fieldValues.pc_notes === "string" && fieldValues.pc_notes.trim()
      ? fieldValues.pc_notes.trim()
      : null;
  const noteBits = [
    contact.notes ? { id: "notes", title: "Notes", meta: contact.notes } : null,
    contact.lifeNotes ? { id: "life-notes", title: "Life Notes", meta: contact.lifeNotes } : null,
    contact.healthNotes ? { id: "health-notes", title: "Health Notes", meta: contact.healthNotes } : null,
    pcNotes ? { id: "pc-notes", title: "P&C Notes", meta: pcNotes } : null,
  ].filter(Boolean) as { id: string; title: string; meta: string }[];

  const sectionCounts: Partial<Record<ContactSectionId, number>> = {
    policies: policies.length,
    deals: deals.length,
    timeline: timeline.length,
    emails: emailItems.length,
    sms: smsItems.length,
    meetings: meetingItems.length,
    documents: docItems.length,
    notes: noteBits.length,
  };

  return (
    <AppShell
      title="Contacts"
      recordContext={{
        contactId: contact.id,
        accountId: businesses[0]?.id,
        dealId: deals[0]?.id,
        name: partyName,
        phone: contact.phone,
        email: contact.email,
      }}
    >
      <DeskPageTrail
        backLabel={fromPolicy ? "Back to policy" : "Back"}
        fallbackHref={fromPolicy ? `/policies/${fromPolicy}` : "/contacts"}
        crumbs={[
          { href: "/contacts", label: "Contacts" },
          ...(fromPolicy
            ? [{ href: `/policies/${fromPolicy}`, label: "Policy" }]
            : []),
          { label: "Contact" },
        ]}
      />
      <div className="mb-3 space-y-1" data-ff-contact-header-bar="">
        <div className="flex flex-wrap items-start gap-2">
          <div className="mt-2 shrink-0">
            <ClientStatusDot status={clientStatus} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold text-navy">
                {contact.lastName}, {contact.firstName}
              </h2>
              <div className="flex min-w-0 flex-wrap items-center gap-2 pl-1">
                <ClientStatusPill status={clientStatus} />
                <span className="text-sm text-muted-foreground">
                  Source · {sourceLabel(contact.source)}
                </span>
                {optedOut ? (
                  <span
                    className="rounded-sm bg-[#BF0A30]/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-[#BF0A30]"
                    data-ff-contact-optout-badge=""
                  >
                    {contact.emailOptOut && contact.smsOptOut
                      ? "Email + SMS Opted Out"
                      : contact.emailOptOut
                        ? "Email Opted Out"
                        : "SMS Opted Out"}
                  </span>
                ) : null}
              </div>
              <div className="ml-auto shrink-0">
                <ContactOverflowMenu
                  contactId={contact.id}
                  emailOptOut={contact.emailOptOut}
                  smsOptOut={contact.smsOptOut}
                  tags={contact.tags}
                  tagExtra={tagExtra}
                />
              </div>
            </div>
            <div className="max-w-xl" data-ff-contact-header-tags="">
              <AssignRecordTags
                module="contacts"
                recordId={contact.id}
                tags={contact.tags}
                catalog={tagExtra.map((row) => ({ name: row.name, color: row.color }))}
                appearance="addLink"
              />
            </div>
          </div>
        </div>
      </div>

      {dups.length > 0 ? (
        <div
          className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-ff-contact-dup-banner=""
          role="status"
        >
          Possible Duplicate
          {dups.slice(0, 3).map((row) => (
            <span key={row.id}>
              :{" "}
              <a href={`/contacts/${row.id}`} className="font-semibold underline">
                {row.lastName}, {row.firstName}
              </a>
            </span>
          ))}
          .
        </div>
      ) : null}

      <ContactDetailWorkspace
        rail={
          <>
            <div className="min-w-0 w-full max-w-full" data-ff-contact-quick-comms="">
              <QuickCommsBoard
                items={comms}
                contactId={contact.id}
                accountId={businesses[0]?.id}
                dealId={deals[0]?.id}
                contactName={partyName}
                contactPhone={contact.phone}
                contactEmail={contact.email}
                officeAddress={officeAddress}
                clientAddress={clientAddress}
              />
            </div>
            <RecordContextRail
              context={context}
              defaultTab="info"
              headingName={partyName}
            />
          </>
        }
      >
        <ContactDetailSections
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
                <ContactAtAGlanceCards
                  contactId={contact.id}
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
                  emailOptOut={contact.emailOptOut}
                  smsOptOut={contact.smsOptOut}
                />
                <LinkedBusinessLine
                  contactId={contact.id}
                  businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
                />
              </section>

              <section
                id="contact-details"
                className="ff-card space-y-3 p-3 scroll-mt-14"
                data-ff-contact-details=""
                data-ff-contact-inline-fields=""
              >
                <div
                  className="flex items-center justify-between gap-3"
                  data-ff-contact-details-header=""
                >
                  <h2 className="text-base font-semibold text-[#002868]">Contact Details</h2>
                  <div className="shrink-0" data-ff-contact-edit-layout="">
                    <EditLayoutLink module="contacts" />
                  </div>
                </div>
                <RecordLayoutForm
                  module="contacts"
                  recordId={contact.id}
                  layout={contactLayout?.layout ?? defaultLayoutForModule("contacts")}
                  fields={contactLayout?.fields ?? []}
                  values={fieldValues}
                  saveLabel="Save Contact"
                  clickToEdit
                />
              </section>
              <RecordModuleMacros module="contacts" recordId={contact.id} />
            </div>
          }
          sections={[
            {
              id: "policies",
              title: "Policies",
              badge: policies.length || undefined,
              "data-ff": "contact-policies",
              children: (
                <ContactPolicyRows
                  contactId={contact.id}
                  coApplicantLinks={coApplicantLinks}
                  policies={policies.map(({ policy, carrier, deal }) => ({
                    id: policy.id,
                    policyNumber: policy.policyNumber,
                    status: policy.status,
                    premium: policy.premium,
                    renewalDate: policy.renewalDate,
                    expirationDate: policy.expirationDate,
                    lineOfBusiness: policy.lineOfBusiness,
                    policyType: policy.policyType,
                    carrierName: carrier?.name ?? null,
                    dealId: deal?.id ?? null,
                    dealTitle: deal?.title ?? null,
                  }))}
                />
              ),
            },
            {
              id: "deals",
              title: "Deals",
              badge: deals.length || undefined,
              "data-ff": "contact-deals",
              children: (
                <ContactDealRows
                  contactId={contact.id}
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
              "data-ff": "contact-timeline",
              children: (
                <ContactTimelineSection
                  items={timeline}
                  contactId={contact.id}
                  policyId={latestPolicyId}
                  dealId={deals[0]?.id}
                  accountId={businesses[0]?.id}
                />
              ),
            },
            {
              id: "emails",
              title: "Emails",
              badge: emailItems.length || undefined,
              "data-ff": "contact-section-emails",
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
              "data-ff": "contact-section-sms",
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
              "data-ff": "contact-section-meetings",
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
              "data-ff": "contact-section-documents",
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
              "data-ff": "contact-section-notes",
              children: (
                <ContactSectionBlock
                  id="notes"
                  title="Notes"
                  count={noteBits.length}
                  emptyLabel="No notes yet. Add notes in Contact Details."
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
      </ContactDetailWorkspace>
    </AppShell>
  );
}
