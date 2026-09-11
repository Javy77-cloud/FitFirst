import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAccountWorkspace, listRecordActivities } from "@/lib/db/queries";
import { isCertifiableLine } from "@/lib/domain";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { listModuleTags } from "@/app/actions/record-tags";
import { BusinessDetailWorkspace } from "@/components/businesses/business-detail-workspace";
import { BusinessHealthBadge } from "@/components/businesses/business-health-badge";
import { BusinessOverflowMenu } from "@/components/businesses/business-overflow-menu";
import { BusinessInlineFields } from "@/components/businesses/business-inline-fields";
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
import { CollapsibleSection } from "@/components/contacts/collapsible-section";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    timeline,
    locations,
  } = workspace;

  const coAppCandidates = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  const [tagExtra, quickComms] = await Promise.all([
    listModuleTags("accounts").catch(() => [] as { name: string; color: string | null }[]),
    listRecordActivities({ accountId: account.id }),
  ]);

  const context = await loadRecordContext({
    accountId: account.id,
    contactId: contacts[0]?.id,
    dealId: deals[0]?.id,
    policyId: policies[0]?.policy.id,
  });

  const lastActivityAt =
    timeline[0] && "occurredAt" in timeline[0]
      ? ((timeline[0] as { occurredAt?: Date | string }).occurredAt ?? account.updatedAt)
      : account.updatedAt;


  const inlineValues: Record<string, string> = {
    ein: account.ein ?? (account.einLast4 ? `•••-••-${account.einLast4}` : ""),
    entity_type: account.entityType ?? "",
    industry: account.industry ?? account.naics ?? account.operations ?? "",
    annual_sales: account.annualSales != null ? String(account.annualSales) : "",
    employee_count: account.employeeCount != null ? String(account.employeeCount) : "",
    payroll:
      account.payrollW2 != null
        ? String(account.payrollW2)
        : account.payrollTotal != null
          ? String(account.payrollTotal)
          : "",
    years_in_business: account.yearsInBusiness != null ? String(account.yearsInBusiness) : "",
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
      title={account.name}
      recordContext={{
        accountId: account.id,
        contactId: contacts[0]?.id,
        dealId: deals[0]?.id,
        name: account.name,
        phone: account.phone,
        email: account.email,
      }}
    >
      <div className="mb-3 space-y-2" data-ff-business-header-bar="">
        <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-[#002868]">
          <BusinessHealthBadge
            activePolicyCount={activePolicyCount}
            policyCount={policyCount}
            lastActivityAt={lastActivityAt}
          />
          <span>{account.name}</span>
          <div className="ml-auto">
            <BusinessOverflowMenu
              accountId={account.id}
              tags={account.tags}
              tagExtra={tagExtra}
            />
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
        <div className="mb-3" data-ff-at-a-glance="">
          <LinkedContactsSection
            accountId={account.id}
            contacts={contacts.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              email: c.email,
            }))}
          />
        </div>

        <BusinessInlineFields accountId={account.id} values={inlineValues} />
        <RecordModuleMacros module="businesses" recordId={account.id} />

        <div className="mt-4 space-y-3">
          <CollapsibleSection
            title="Insured Locations"
            badge={locations.length || undefined}
            defaultOpen={false}
            data-ff="business-locations"
          >
            <BusinessLocationsSection
              accountId={account.id}
              locations={locations}
              coveringPolicies={coveringPolicies}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Commercial Policies"
            badge={policies.length || undefined}
            defaultOpen={false}
            data-ff="business-policies"
          >
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
                // Fallback: policy named-insured contact (policy.contactId) — no M2M, no Business linker.
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
          </CollapsibleSection>

          <CollapsibleSection
            title="Deals"
            badge={deals.length || undefined}
            defaultOpen={false}
            data-ff="business-deals"
          >
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
          </CollapsibleSection>

          <BusinessTimelineSection
            items={timeline}
            accountId={account.id}
            contactId={contacts[0]?.id}
            policyId={policies[0]?.policy.id}
            dealId={deals[0]?.id}
          />
        </div>
      </BusinessDetailWorkspace>
    </AppShell>
  );
}
