import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/domain";
import { listCarriers } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";

export const dynamic = "force-dynamic";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["portal", "line"]);
  const q = firstParam(params.q) ?? "";
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
        <ColumnTable
          moduleId="carriers"
          initialQuery={q}
          columns={[
            { id: "carrier", label: "Carrier", locked: true },
            { id: "portal", label: "Portal" },
            { id: "covA", label: "Cov A" },
            { id: "rules", label: "Roof / coast / mobile" },
            { id: "dontWrite", label: "Don't write" },
          ]}
          empty="No carriers match this filter."
          rows={rows.map(({ carrier, rule }) => ({
            key: `${carrier.id}-${rule?.id ?? "none"}`,
            hay: haystack([
              carrier.name,
              carrier.naic,
              carrier.territory,
              ...(carrier.writtenLines ?? []),
            ]),
            cells: {
              carrier: (
                <div className="font-medium">
                  <Link href={`/carriers/${carrier.id}`} className="text-primary hover:underline">
                    {carrier.name}
                  </Link>
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
