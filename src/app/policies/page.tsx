import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listPolicies } from "@/lib/db/queries";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
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
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { buildPolicyLabel } from "@/lib/policy/auto-label";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";
import { IN_FORCE_STATUSES, LAPSE_STATUSES } from "@/lib/home/aggregate";
import {
  addUtcDays,
  deskNow,
  endOfUtcMonth,
  priorMonth,
  startOfUtcMonth,
} from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { BookCommandWorkspace } from "@/components/book-lists/book-workspace";
import { loadPolicyNeedSignals } from "@/lib/book-lists/load";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { matchesBookLens, parseBookHeat, parseBookLayout, parseBookLens } from "@/lib/book-lists/lenses";
import { presentPolicyCard } from "@/lib/book-lists/present";
import { POLICY_COLUMNS } from "@/lib/book-lists/types";

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
  const asOf = deskNow();

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
  const heat = parseBookHeat(firstParam(params.heat));
  const lens = parseBookLens(firstParam(params.lens));
  const layout = parseBookLayout(firstParam(params.view));
  const [all, tagCatalog, labelTemplate, pageFilters, session, needs, lineSettings] = await Promise.all([
    listPolicies(),
    listModuleTags("policies").catch(() => []),
    getAgencyPolicyLabelTemplate(),
    loadPageFilterPrefs("policies"),
    currentDeskSession(),
    loadPolicyNeedSignals(),
    loadDeskLineSettings(),
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
      : "Urgency first: renewal proximity, cold silence, and open needs.");
  const asOf = deskNow();
  const cards = rows
    .map(({ policy, contact, account, carrier }) => {
      const displayName = policyListLabel(labelTemplate, policy, {
        ownerName: partyLabel(contact, account),
        carrier: carrier?.name,
      });
      return presentPolicyCard(
        {
          id: policy.id,
          policyNumber: policy.policyNumber,
          displayName,
          status: policy.status,
          lineOfBusiness: policy.lineOfBusiness,
          premium: policy.premium,
          expirationDate: policy.expirationDate,
          updatedAt: policy.updatedAt,
          tags: policy.tags,
          partyName: partyLabel(contact, account),
          carrierName: carrier?.name,
          phone: contact?.phone ?? account?.phone,
          email: contact?.email ?? account?.email,
        },
        needs.get(policy.id) ?? { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 },
        asOf,
      );
    })
    .filter((card) => matchesBookLens(card, { heat, lens, q }));

  return (
    <AppShell title="Policies">
      <p className="mb-3 text-base text-muted-foreground">{hint}</p>
      <div className="mb-3 rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm">
        <PipelineFilterPopover
          moduleId="policies"
          fields={filterFieldsFromPageFilters(visibleFilters)}
          searchPlaceholder="Find a policy, party, or carrier…"
          preserveParams={["heat", "lens", "view"]}
          canConfigure={session.isAdmin}
          searchClassName={PAGE_FILTER_SEARCH_CLASS}
          searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
        />
      </div>
      {key ? (
        <p className="mb-3 text-sm">
          <Link href="/policies" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <ModuleListActions
        module="policies"
        recordIds={cards.map((card) => card.id)}
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
        <BookCommandWorkspace
          surface="policies"
          path="/policies"
          layout={layout}
          columns={POLICY_COLUMNS}
          cards={cards}
          heat={heat}
          lens={lens}
          q={q}
          empty="No policies in this lens. Bind a shopping deal when a market is actually written."
          lineSettings={lineSettings}
          preserve={{ view: layout === "list" ? "list" : undefined }}
          renderLeading={(card) => <SelectRowCheckbox id={card.id} />}
          renderExtra={(card) => (
            <>
              <AssignRecordTags
                module="policies"
                recordId={card.id}
                tags={card.tags}
                catalog={tagCatalog}
              />
              <span className="sr-only">{tagSortText(card.tags)}</span>
            </>
          )}
        />
      </ModuleListActions>
    </AppShell>
  );
}
