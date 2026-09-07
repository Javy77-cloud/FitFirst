import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { formatMoney } from "@/lib/domain";
import { listCarriers } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CARRIERS_LIST_COLUMNS } from "@/lib/list-columns";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { RecordLink } from "@/components/record-links";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";

export const dynamic = "force-dynamic";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["portal", "line"]);
  const q = firstParam(params.q) ?? "";
  const [all, tagCatalog] = await Promise.all([
    listCarriers(),
    listModuleTags("carriers").catch(() => []),
  ]);
  const rows = all.filter(({ carrier }) => {
    if (!matchesField(carrier.portalStatus, filter.portal)) return false;
    if (filter.line && !(carrier.writtenLines ?? []).some((line) => line.toUpperCase() === filter.line.toUpperCase())) {
      return false;
    }
    return true;
  });
  return (
    <AppShell title="Carriers & appetite">
      <p className="mb-3 text-base text-muted-foreground">
        Structured appetite only. The 2026-09-02 Palm Bay shop is a fixture, not production
        underwriting.
      </p>
      <SavedFiltersBar
        moduleId="carriers"
        searchPlaceholder="Contains carrier, NAIC, line…"
        fields={[
          {
            key: "portal",
            label: "Portal",
            options: uniqueOptions(all.map(({ carrier }) => carrier.portalStatus)),
          },
          {
            key: "line",
            label: "Line",
            options: LINES.map((value) => ({ value, label: value })),
          },
        ]}
      />
      <section className="ff-card overflow-hidden">
        <ModuleListActions
          module="carriers"
          recordIds={[...new Set(rows.map(({ carrier }) => carrier.id))]}
          records={[
            ...new Map(
              rows.map(({ carrier }) => [
                carrier.id,
                {
                  id: carrier.id,
                  label: carrier.name,
                  email: carrier.underwriterEmail ?? carrier.accountManagerEmail,
                  phone: carrier.agentPhone ?? carrier.customerServicePhone ?? carrier.underwriterPhone,
                },
              ]),
            ).values(),
          ]}
        >
        <DeskColumnTable
          moduleId="carriers"
          initialQuery={q}
          columns={CARRIERS_LIST_COLUMNS}
          empty="No carriers match this filter."
          rows={rows.map(({ carrier, rule }) => ({
            key: `${carrier.id}-${rule?.id ?? "none"}`,
            hay: haystack([
              carrier.name,
              carrier.naic,
              carrier.territory,
              ...(carrier.writtenLines ?? []),
              ...(carrier.tags ?? []),
            ]),
            sort: {
              pick: "",
              carrier: carrier.name,
              portal: carrier.portalStatus,
              tags: tagSortText(carrier.tags),
            },
            cells: {
              pick: <SelectRowCheckbox id={carrier.id} />,
              carrier: (
                <div className="font-medium">
                  <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink>
                  <div className="text-base text-muted-foreground">
                    {(carrier.writtenLines ?? []).join(", ")}
                  </div>
                </div>
              ),
              portal: (
                <span className="uppercase">{carrier.portalStatus.replaceAll("_", " ")}</span>
              ),
              covA: (
                <span className="text-xs">
                  {rule ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}` : "—"}
                </span>
              ),
              rules: (
                <span className="text-xs">
                  {rule ? (
                    <>
                      max roof {rule.maxRoofAge ?? "—"}y · coast{" "}
                      {rule.minMilesToCoast ?? 0}+ mi · mobile{" "}
                      {rule.mobileAllowed ? "yes" : "no"}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              ),
              dontWrite: <span className="text-xs">{carrier.dontWriteNotes}</span>,
              tags: (
                <AssignRecordTags
                  module="carriers"
                  recordId={carrier.id}
                  tags={carrier.tags}
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
