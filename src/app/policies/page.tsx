import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import { listPolicies } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { POLICIES_LIST_COLUMNS } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { firstParam, pickFilterParams } from "@/lib/saved-filters";
import {
  enabledPageFilters,
  filterFieldsFromPageFilters,
  PAGE_FILTER_SEARCH_CLASS,
  PAGE_FILTER_SEARCH_INPUT_CLASS,
  mergeLiveOptions,
  matchesPageFilters,
  pageFilterParamKeys,
} from "@/lib/page-filters";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import { currentDeskSession } from "@/lib/auth/session";
import { haystack } from "@/lib/search/live-query";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { buildPolicyLabel } from "@/lib/policy/auto-label";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";
import { IN_FORCE_STATUSES, LAPSE_STATUSES } from "@/lib/home/aggregate";
import {
  addUtcDays,
  DESK_AS_OF,
  endOfUtcMonth,
  priorMonth,
  startOfUtcMonth,
} from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";

function policyListLabel(
  labelTemplate: Parameters<typeof buildPolicyLabel>[0],
  policy: {
    labelOverride?: string | null;
    policyNumber: string;
    policyType?: string | null;
    lineOfBusiness: string;
    formType?: string | null;
    policySubType?: string | null;
    status: string;
    effectiveDate: Date | string;
    expirationDate: Date | string;
  },
  party: { ownerName?: string | null; carrier?: string | null },
) {
  const override = policy.labelOverride?.trim();
  if (override) return override;
  return buildPolicyLabel(labelTemplate, {
    ownerName: party.ownerName,
    carrier: party.carrier,
    policyType: policy.policyType,
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
    formType: policy.formType,
    policySubType: policy.policySubType,
    status: policy.status,
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
  });
}

function policyFilterValues(
  policy: {
    status: string;
    lineOfBusiness: string;
    effectiveDate: Date;
    expirationDate: Date;
    carrierId?: string | null;
  },
  carrierName?: string | null,
) {
  const status = policy.status.toLowerCase();
  const statusValues = [policy.status];
  if (IN_FORCE_STATUSES.has(status)) statusValues.push("in_force");

  const written: string[] = [];
  const renewal: string[] = [];
  const attention: string[] = [];
  const asOf = DESK_AS_OF;

  if (LAPSE_STATUSES.has(status)) attention.push("lapse");

  if (IN_FORCE_STATUSES.has(status)) {
    const effective = policy.effectiveDate;
    if (effective >= startOfUtcMonth(asOf) && effective <= endOfUtcMonth(asOf)) {
      written.push("this_month");
    }
    const last = priorMonth(asOf);
    if (effective >= startOfUtcMonth(last) && effective <= endOfUtcMonth(last)) {
      written.push("last_month");
    }
    if (policy.expirationDate > asOf) {
      for (const days of [30, 60, 90] as const) {
        if (policy.expirationDate <= addUtcDays(asOf, days)) {
          renewal.push(String(days));
        }
      }
    }
  }

  return {
    status: statusValues,
    line: policy.lineOfBusiness,
    written,
    renewal,
    attention,
    carrier: carrierName ?? "",
    carrierId: policy.carrierId ?? "",
  };
}

export const dynamic = "force-dynamic";

const FILTER_COPY: Record<string, string> = {
  "status:in_force": "Active and Bound only. Quotes are not on this list.",
  "written:this_month": "In-force terms effective this desk month (September 2026).",
  "written:last_month": "In-force terms effective last desk month (August 2026).",
  "renewal:30": "In-force terms expiring in the next 30 days.",
  "renewal:60": "In-force terms expiring in the next 60 days.",
  "renewal:90": "In-force terms expiring in the next 90 days.",
  "attention:lapse": "Lapsed, cancelled, or expired — not in-force premium.",
};

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const [all, tagCatalog, labelTemplate, pageFilters, session] = await Promise.all([
    listPolicies(),
    listModuleTags("policies").catch(() => []),
    getAgencyPolicyLabelTemplate(),
    loadPageFilterPrefs("policies"),
    currentDeskSession(),
  ]);
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    line: all.map(({ policy }) => policy.lineOfBusiness),
    carrier: all.map(({ carrier }) => carrier?.name ?? ""),
    status: all.map(({ policy }) => policy.status),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const rows = all.filter(({ policy, carrier }) =>
    matchesPageFilters(policyFilterValues(policy, carrier?.name), filter),
  );
  const key = Object.entries(filter)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`)
    .join(" · ");
  const pair = Object.entries(filter).find(([, value]) => value);
  const hint =
    FILTER_COPY[pair ? `${pair[0]}:${pair[1]}` : ""] ??
    (key
      ? `Filtered · ${key}`
      : "Policies exist only after bind. Expiration tracking hangs off these records.");

  return (
    <AppShell title="Policies">
      <p className="mb-3 text-base text-muted-foreground">{hint}</p>
      <PipelineFilterPopover
        moduleId="policies"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Contains Policy #, Party, Carrier…"
        preserveParams={[]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
      />
      {key ? (
        <p className="mb-3 text-sm">
          <Link href="/policies" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        <ModuleListActions
          module="policies"
          recordIds={rows.map(({ policy }) => policy.id)}
          records={rows.map(({ policy, contact, account, carrier }) => ({
            id: policy.id,
            label: policyListLabel(labelTemplate, policy, {
              ownerName: partyLabel(contact, account),
              carrier: carrier?.name,
            }),
            email: contact?.email ?? account?.email,
            phone: contact?.phone ?? account?.phone,
            policyId: policy.id,
            contactId: contact?.id ?? policy.contactId,
            accountId: account?.id ?? policy.accountId,
            dealId: policy.dealId,
          }))}
        >
        <DeskColumnTable
          moduleId="policies"
          initialQuery={q}
          columns={POLICIES_LIST_COLUMNS}
          empty="No policies match. Bind a shopping deal when a market is actually written."
          rows={rows.map(({ policy, contact, account, carrier, owner }) => ({
            key: policy.id,
            hay: haystack([
              policyListLabel(labelTemplate, policy, {
                ownerName: partyLabel(contact, account),
                carrier: carrier?.name,
              }),
              policy.policyNumber,
              policy.lineOfBusiness,
              policy.status,
              carrier?.name,
              owner?.name,
              contact ? `${contact.lastName} ${contact.firstName}` : null,
              account?.name,
              ...(policy.tags ?? []),
            ]),
            sort: {
              pick: "",
              policy: policy.policyNumber,
              status: policy.status,
              party: contact
                ? `${contact.lastName}, ${contact.firstName}`
                : (account?.name ?? ""),
              carrier: carrier?.name ?? "",
              owner: owner?.name ?? "",
              premium: policy.premium ?? "",
              expires: policy.expirationDate.toISOString(),
              esign: policy.esignStatus ?? "",
              tags: tagSortText(policy.tags),
            },
            cells: {
              pick: <SelectRowCheckbox id={policy.id} />,
              policy: (
                <div className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>
                      {policyListLabel(labelTemplate, policy, {
                        ownerName: partyLabel(contact, account),
                        carrier: carrier?.name,
                      })}
                    </RecordLink>
                  </span>
                  <PolicyQuickActions
                    policyId={policy.id}
                    phone={contact?.phone ?? account?.phone ?? null}
                    email={contact?.email ?? account?.email ?? null}
                    contactId={contact?.id ?? policy.contactId}
                    accountId={account?.id ?? policy.accountId}
                  />
                </div>
              ),
              status: <PolicyStatusBadge status={policy.status} />,
              party: contact ? (
                <RecordLink href={`/contacts/${contact.id}`}>
                  {contact.lastName}, {contact.firstName}
                </RecordLink>
              ) : account ? (
                <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
              ) : (
                "—"
              ),
              carrier: carrier?.name ?? "—",
              owner: owner?.name ?? "—",
              premium: formatMoney(policy.premium),
              expires: formatDay(policy.expirationDate),
              esign: formatInDeskEsignList(
                policy.esignStatus,
                policy.esignSignedAt,
                policy.esignRequestedAt,
              ),
              tags: (
                <AssignRecordTags
                  module="policies"
                  recordId={policy.id}
                  tags={policy.tags}
                  catalog={tagCatalog}
                />
              ),
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
