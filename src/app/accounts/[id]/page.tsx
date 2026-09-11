import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClientStatusPill } from "@/components/record-links";
import { getAccountWorkspace } from "@/lib/db/queries";
import { isCertifiableLine } from "@/lib/domain";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { listModuleTags } from "@/app/actions/record-tags";
import { AccountGlance } from "@/components/crm/account-glance";
import { BusinessDetailWorkspace } from "@/components/businesses/business-detail-workspace";
import { BusinessHealthBadge } from "@/components/businesses/business-health-badge";
import { BusinessOverflowMenu } from "@/components/businesses/business-overflow-menu";
import { BusinessQuickActions } from "@/components/businesses/business-quick-actions";
import { BusinessInlineFields } from "@/components/businesses/business-inline-fields";
import { LinkedContactsSection } from "@/components/businesses/linked-contacts-section";
import { BusinessLocationsSection } from "@/components/businesses/business-locations-section";
import { BusinessPolicyRows } from "@/components/businesses/business-policy-rows";
import { BusinessDealRows } from "@/components/businesses/business-deal-rows";
import { BusinessTimelineSection } from "@/components/businesses/business-timeline-section";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";

export const dynamic = "force-dynamic";

function moneyNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

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
    policyCount,
    activePolicyCount,
    clientStatus,
    timeline,
    locations,
  } = workspace;

  const [tagExtra] = await Promise.all([
    listModuleTags("accounts").catch(() => [] as { name: string; color: string | null }[]),
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

  const lifetimeValue = policies.reduce(
    (sum, row) => sum + moneyNumber(row.policy.premium),
    0,
  );

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
          <ClientStatusPill status={clientStatus} />
          {account.phone ? (
            <a
              href={`tel:${account.phone.replace(/\D/g, "")}`}
              className="text-sm font-normal text-muted-foreground hover:text-[#002868] hover:underline"
            >
              {account.phone}
            </a>
          ) : null}
          {account.email ? (
            <a
              href={`mailto:${account.email}`}
              className="text-sm font-normal text-muted-foreground hover:text-[#002868] hover:underline"
            >
              {account.email}
            </a>
          ) : null}
          <div className="ml-auto">
            <BusinessOverflowMenu
              accountId={account.id}
              tags={account.tags}
              tagExtra={tagExtra}
            />
          </div>
        </div>
        <BusinessQuickActions
          accountId={account.id}
          phone={account.phone}
          email={account.email}
          contactId={contacts[0]?.id}
        />
      </div>

      <BusinessDetailWorkspace
        rail={
          <>
            <div className="ff-card space-y-2 p-3" data-ff-business-rail-meta="">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ClientStatusPill status={clientStatus} />
                <span className="text-muted-foreground">
                  {activePolicyCount} In Force · {policyCount} Lifetime
                </span>
              </div>
            </div>
            <RecordContextRail
              context={context}
              defaultTab="conversations"
              headingName={account.name}
            />
          </>
        }
      >
        <AccountGlance
          policyCount={policyCount}
          activePolicyCount={activePolicyCount}
          dealCount={deals.length}
          activityCount={timeline.length}
          lifetimeValue={lifetimeValue}
        />

        <RecordModuleMacros module="businesses" recordId={account.id} />

        <div className="mt-4 space-y-3">
          <CollapsibleSection
            title="Account 360"
            defaultOpen={false}
            data-ff="business-account-360"
          >
            <BusinessInlineFields accountId={account.id} values={inlineValues} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Linked Contacts"
            badge={contacts.length || undefined}
            defaultOpen={false}
            data-ff="business-linked-contacts"
          >
            <LinkedContactsSection
              accountId={account.id}
              contacts={contacts.map((c) => ({
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
              }))}
            />
          </CollapsibleSection>

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
              policies={policies.map(({ policy, carrier }) => ({
                id: policy.id,
                policyNumber: policy.policyNumber,
                status: policy.status,
                premium: policy.premium,
                renewalDate: policy.renewalDate,
                expirationDate: policy.expirationDate,
                lineOfBusiness: policy.lineOfBusiness,
                carrierName: carrier?.name ?? null,
                certifiable: isCertifiableLine(policy.lineOfBusiness),
              }))}
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

          <CollapsibleSection
            title="Timeline"
            badge={timeline.length || undefined}
            defaultOpen={false}
            data-ff="business-timeline"
          >
            <BusinessTimelineSection
              items={timeline}
              accountId={account.id}
              contactId={contacts[0]?.id}
              policyId={policies[0]?.policy.id}
              dealId={deals[0]?.id}
            />
          </CollapsibleSection>
        </div>

      </BusinessDetailWorkspace>
    </AppShell>
  );
}
