import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { formatMoney } from "@/lib/domain";
import { getContactWorkspace } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { RecordLayoutForm } from "@/components/custom-fields/record-layout-form";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { AccountGlance } from "@/components/crm/account-glance";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { sourceLabel } from "@/lib/crm/sources";
import { RecordTags } from "@/components/tags/record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";
import { ContactDetailWorkspace } from "@/components/contacts/contact-detail-workspace";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { ContactHealthBadge } from "@/components/contacts/contact-health-badge";
import { ContactQuickActions } from "@/components/contacts/contact-quick-actions";
import { ContactOverflowMenu } from "@/components/contacts/contact-overflow-menu";
import { CoApplicantSection } from "@/components/contacts/co-applicant-section";
import { LinkedBusinessLine } from "@/components/contacts/linked-business-line";
import { SavedToast } from "@/components/desk/saved-toast";
import { softEmailPhoneDups } from "@/lib/contacts/soft-dup";
import {
  contactCardLayout,
  contactClassicLayout,
} from "@/lib/contacts/contact-field-catalog";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const saved = (Array.isArray(sp.saved) ? sp.saved[0] : sp.saved) === "1";
  const workspace = await getContactWorkspace(id);
  if (!workspace) notFound();
  const {
    contact,
    policies,
    deals,
    businesses,
    coApplicants,
    policyCount,
    activePolicyCount,
    clientStatus,
    timeline,
    locations,
  } = workspace;
  const latestPolicyId = policies[0]?.policy.id ?? null;
  const lastActivityAt =
    timeline[0] && "occurredAt" in timeline[0]
      ? ((timeline[0] as { occurredAt?: Date | string }).occurredAt ?? contact.updatedAt)
      : contact.updatedAt;

  const jar = await cookies();
  const layoutPref = jar.get("ff_contacts_layout")?.value === "classic" ? "classic" : "card";

  const [tagExtra, contactLayout, book] = await Promise.all([
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
  ]);
  const dups = softEmailPhoneDups(book, contact);
  const context = await loadRecordContext({
    contactId: contact.id,
    accountId: businesses[0]?.id,
    dealId: deals[0]?.id,
    policyId: latestPolicyId,
  });

  const layout =
    contactLayout?.layout ??
    (layoutPref === "classic" ? contactClassicLayout() : contactCardLayout()) ??
    defaultLayoutForModule("contacts");

  return (
    <AppShell
      title={`${contact.lastName}, ${contact.firstName}`}
      recordContext={{
        contactId: contact.id,
        accountId: businesses[0]?.id,
        dealId: deals[0]?.id,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        phone: contact.phone,
        email: contact.email,
      }}
    >
      <SavedToast show={saved} message="Contact saved." listHref="/contacts" />

      <div className="mb-3 space-y-2" data-ff-contact-header-bar="">
        <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-[#002868]">
          <ContactHealthBadge policyCount={policyCount} lastActivityAt={lastActivityAt} />
          <span>
            {contact.lastName}, {contact.firstName}
          </span>
          {coApplicants[0] ? (
            <>
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/contacts/${coApplicants[0].id}`}
                className="text-[#002868] hover:underline"
                data-ff-header-coapplicant=""
              >
                {coApplicants[0].lastName}, {coApplicants[0].firstName}
              </Link>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ContactQuickActions
            contactId={contact.id}
            phone={contact.phone}
            email={contact.email}
            accountId={businesses[0]?.id}
          />
          <ContactOverflowMenu
            contactId={contact.id}
            emailOptOut={contact.emailOptOut}
            smsOptOut={contact.smsOptOut}
          />
        </div>
      </div>

      {dups.length > 0 ? (
        <div
          className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-ff-contact-dup-banner=""
          role="status"
        >
          Possible duplicate
          {dups.slice(0, 3).map((row) => (
            <span key={row.id}>
              :{" "}
              <Link href={`/contacts/${row.id}`} className="font-semibold underline">
                {row.lastName}, {row.firstName}
              </Link>
            </span>
          ))}
          . Save still works.
        </div>
      ) : null}

      <ContactDetailWorkspace
        rail={
          <>
            <AccountGlance
              policyCount={policyCount}
              activePolicyCount={activePolicyCount}
              dealCount={deals.length}
              activityCount={timeline.length}
              emailOptOut={contact.emailOptOut}
              smsOptOut={contact.smsOptOut}
            />
            <div className="ff-card space-y-2 p-3" data-ff-contact-rail-meta="">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ClientStatusPill status={clientStatus} />
                <span className="text-muted-foreground">Source · {sourceLabel(contact.source)}</span>
              </div>
              <RecordTags
                module="contacts"
                recordId={contact.id}
                tags={contact.tags}
                suggestions={suggestedTagsFor(
                  "contacts",
                  tagExtra.map((row) => row.name),
                )}
                colors={colorsFromModuleTags(tagExtra)}
              />
            </div>
            <RecordContextRail
              context={context}
              defaultTab="conversations"
              headingName={`${contact.firstName} ${contact.lastName}`.trim()}
            />
          </>
        }
      >
        <div className="mb-3" data-ff-at-a-glance="">
          <LinkedBusinessLine
            contactId={contact.id}
            businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
          />
        </div>

        <RecordLayoutForm
          module="contacts"
          recordId={contact.id}
          layout={layout}
          fields={contactLayout?.fields ?? []}
          values={mergeRecordSystemValues(
            contact as unknown as Record<string, unknown>,
            contactLayout?.stored ?? {},
            contactLayout?.fields ?? [],
          )}
          saveLabel="Save Contact"
        />
        <RecordModuleMacros module="contacts" recordId={contact.id} />

        <div className="mt-4 space-y-3">
          <CoApplicantSection
            contactId={contact.id}
            coApplicants={coApplicants.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              email: c.email,
              phone: c.phone,
            }))}
          />

          <CollapsibleSection title="Locations" defaultOpen={false} data-ff="contact-locations">
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No locations.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {locations.map((location) => (
                  <li key={location.id} className="py-2">
                    <div className="font-medium text-navy">
                      {location.label || location.address1 || location.street || "Location"}
                    </div>
                    <div className="text-muted-foreground">
                      {[location.address1 || location.street, location.city, location.state, location.zip]
                        .filter(Boolean)
                        .join(", ") || "No street on file"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Policies"
            badge={policies.length || undefined}
            defaultOpen={false}
            data-ff="contact-policies"
          >
            <div data-ff-contact-policies="">
              {policies.length === 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No policies. Quotes on a deal do not create a policy.</p>
                  <Link
                    href={`/policies/new?contactId=${contact.id}`}
                    className="inline-flex font-semibold text-[#002868] hover:underline"
                  >
                    Create Policy
                  </Link>
                </div>
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
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Deals"
            badge={deals.length || undefined}
            defaultOpen={false}
            data-ff="contact-deals"
          >
            <div data-ff-contact-deals="">
              {deals.length === 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No deals linked.</p>
                  <Link
                    href={`/deals/new?contactId=${contact.id}`}
                    className="inline-flex font-semibold text-[#002868] hover:underline"
                  >
                    Create Deal
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {deals.map((deal) => (
                    <li key={deal.id} className="py-2 text-sm">
                      <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
                      <span className="ml-2 text-xs uppercase text-muted-foreground">
                        {deal.pipelineStage}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleSection>

          <div className="mb-4" data-ff-contact-timeline="">
            <ActivityTimeline
              items={timeline}
              contactId={contact.id}
              policyId={latestPolicyId}
              dealId={deals[0]?.id}
              accountId={businesses[0]?.id}
            />
          </div>
        </div>
      </ContactDetailWorkspace>
    </AppShell>
  );
}
