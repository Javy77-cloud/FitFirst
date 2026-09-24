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
import { LAPSE_STATUSES } from "@/lib/home/aggregate";
import { deskNow } from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { BookCommandWorkspace } from "@/components/book-lists/book-workspace";
import { loadPolicyNeedSignals, loadRenewalPremiums } from "@/lib/book-lists/load";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { matchesBookLens, parseBookHeat, parseBookLayout, parseBookLens } from "@/lib/book-lists/lenses";
import { presentPolicyCard } from "@/lib/book-lists/present";
import { POLICY_COLUMNS } from "@/lib/book-lists/types";
import { loadPolicyTermCandidates } from "@/lib/policies/load-terms";
import {
  bandIsOffBook,
  businessDateKey,
  deskTermBandLabel,
  normalizeNamedInsured,
  resolveCurrentTerm,
} from "@/lib/policies/current-term";
import { daysUntilRenewal } from "@/lib/policies/renewal-date";
import { etDateKey } from "@/lib/time/et";

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

function etMonthKey(asOf: Date, monthOffset = 0): string {
  const today = etDateKey(asOf);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const cursor = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
}

function policyFilterValues(
  policy: {
    status: string;
    lineOfBusiness: string;
    carrierId?: string | null;
  },
  resolved: ReturnType<typeof resolveCurrentTerm>,
  carrierName?: string | null,
) {
  const status = policy.status.toLowerCase();
  const statusValues = [policy.status];
  if (resolved.countsAsInForce) statusValues.push("in_force");

  const written: string[] = [];
  const renewal: string[] = [];
  const attention: string[] = [];
  const asOf = deskNow();

  if (bandIsOffBook(resolved.band) || LAPSE_STATUSES.has(status)) attention.push("lapse");

  if (resolved.countsAsInForce) {
    const effective = resolved.bookEffective ?? businessDateKey(resolved.current?.effective);
    if (effective?.startsWith(etMonthKey(asOf, 0))) written.push("this_month");
    if (effective?.startsWith(etMonthKey(asOf, -1))) written.push("last_month");
    const days = resolved.daysLeft;
    if (days != null && days >= 0) {
      for (const window of [30, 60, 90] as const) {
        if (days <= window) renewal.push(String(window));
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
  const renewalPremiums = await loadRenewalPremiums(all.map(({ policy }) => policy.id));
  const termIndex = await loadPolicyTermCandidates(all.map(({ policy }) => policy.id));
  const asOf = deskNow();
  const resolvedFor = (row: (typeof all)[number]) => {
    const named = row.contact
      ? `${row.contact.firstName} ${row.contact.lastName}`
      : row.account?.name ?? null;
    return resolveCurrentTerm(
      {
        status: row.policy.status,
        lineOfBusiness: row.policy.lineOfBusiness,
        policyNumber: row.policy.policyNumber,
        carrierName: row.carrier?.name,
        namedInsured: named,
        effectiveDate: row.policy.effectiveDate,
        expirationDate: row.policy.expirationDate,
        renewalDate: row.policy.renewalDate,
        premium: row.policy.premium,
        sourceDocumentId: row.policy.sourceDocumentId,
        terms: termIndex.get(row.policy.id) ?? [],
      },
      asOf,
    );
  };
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    line: all.map(({ policy }) => policy.lineOfBusiness),
    carrier: all.map(({ carrier }) => carrier?.name ?? ""),
    status: all.map(({ policy }) => policy.status),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const rows = all.filter((row) =>
    matchesPageFilters(policyFilterValues(row.policy, resolvedFor(row), row.carrier?.name), filter),
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
  const cards = rows
    .map((row) => {
      const { policy, contact, account, carrier } = row;
      const resolved = resolvedFor(row);
      const namedRaw = partyLabel(contact, account);
      const named = contact ? (normalizeNamedInsured(namedRaw) ?? namedRaw) : namedRaw;
      const displayName = policyListLabel(labelTemplate, policy, {
        ownerName: named,
        carrier: carrier?.name,
      });
      const offBook = bandIsOffBook(resolved.band);
      return presentPolicyCard(
        {
          id: policy.id,
          policyNumber: policy.policyNumber,
          displayName,
          status: offBook ? resolved.band : policy.status,
          statusLabel: deskTermBandLabel(resolved.band, policy.status),
          offBook,
          daysUntil: daysUntilRenewal(
            {
              renewalDate: policy.renewalDate,
              bookExpiration: resolved.bookExpiration,
              expirationDate: policy.expirationDate,
            },
            asOf,
          ),
          renewalDate: policy.renewalDate,
          lineOfBusiness: policy.lineOfBusiness,
          premium: resolved.current?.premium ?? policy.premium,
          renewalPremium: resolved.upcoming?.premium ?? renewalPremiums.get(policy.id) ?? null,
          formType: policy.formType,
          policyType: policy.policyType,
          policySubType: policy.policySubType,
          billingFrequency: policy.billingFrequency,
          premiumFrequency: policy.premiumFrequency,
          expirationDate: resolved.bookExpiration ?? policy.expirationDate,
          updatedAt: policy.updatedAt,
          tags: policy.tags,
          partyName: named,
          carrierName: carrier?.name,
          phone: contact?.phone ?? account?.phone,
          email: contact?.email ?? account?.email,
        },
        needs.get(policy.id) ?? { openClaims: 0, pendingEndorsements: 0, missingDocs: 0, renewalHandled: false },
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
          preserve={{ view: layout === "stack" ? "stack" : undefined }}
          renderLeading={(card) => <SelectRowCheckbox id={card.id} />}
          renderExtra={(card) => (
            <>
              <AssignRecordTags
                module="policies"
                recordId={card.id}
                tags={card.tags}
                catalog={tagCatalog}
                emptyPlaceholder="none"
              />
              <span className="sr-only">{tagSortText(card.tags)}</span>
            </>
          )}
        />
      </ModuleListActions>
    </AppShell>
  );
}
