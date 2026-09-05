import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/domain";
import { listCarriers } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CARRIERS_LIST_COLUMNS } from "@/lib/list-columns";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["portal", "line"]);
  const all = await listCarriers();
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
        <DeskColumnTable
          moduleId="carriers"
          columns={CARRIERS_LIST_COLUMNS}
          empty="No carriers match this filter."
          rows={rows.map(({ carrier, rule }) => ({
            key: `${carrier.id}-${rule?.id ?? "none"}`,
            cells: {
              carrier: (
                <div className="font-medium">
                  {carrier.name}
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
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
