import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import {
  APPETITE_LINE_TABS,
  appetiteLineLabel,
  datasheetDisplay,
  filtersToSearchParams,
  lineTabHref,
  parseAppetiteDatasheetFilters,
  summarizeTrainingRows,
} from "@/lib/appetite/training-datasheet";
import { listAppetiteTrainingFilterOptions, listAppetiteTrainingLogs } from "@/lib/db/queries";
import {
  inferQuoteOutcomes,
  normalizeRiskOutcome,
  riskOutcomePillClass,
} from "@/lib/quotes/outcomes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeveloperAppetiteLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSiteDeveloperPage();
  const query = await searchParams;
  const filters = parseAppetiteDatasheetFilters(query);
  const [rows, options] = await Promise.all([
    listAppetiteTrainingLogs(filters),
    listAppetiteTrainingFilterOptions(filters.line),
  ]);
  const summary = summarizeTrainingRows(rows);
  const exportHref = `/settings/developer/appetite-log/export${filtersToSearchParams(filters)}`;
  const lineLabel = appetiteLineLabel(filters.line);

  return (
    <SettingsShell
      title="Appetite Log"
      current="developer"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/developer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Developer Hub
          </Link>
          <a href={exportHref} className={cn(buttonVariants({ size: "sm" }))}>
            Export CSV
          </a>
        </div>
      }
    >
      <p className="mb-3 max-w-4xl text-sm text-muted-foreground" data-ff-appetite-intro="">
        Line-scoped training datasheet for appetite prediction. Sheets are partitioned by{" "}
        <code className="text-xs">quote_attempt_logs.line_of_business</code> (Home, Auto, RV, Boat,
        Flood, …) so predictions use the right sheet. Viewing{" "}
        <span className="font-semibold text-navy">{lineLabel}</span> — Home-rich feature columns
        first; other lines keep the same grid for now (VIN/year/make snaps later). Every Gaya/API
        quote attempt should land a row; sparse older snaps stay blank. Site developers only.
      </p>

      <div className="mb-3 flex flex-wrap gap-1" data-ff-appetite-line-tabs="">
        {APPETITE_LINE_TABS.map((tab) => {
          const active = tab.key === filters.line;
          const count = options.countsByLine[tab.key] ?? 0;
          return (
            <Link
              key={tab.key}
              href={lineTabHref(tab.key, { ...filters, carrierId: undefined, county: undefined, result: undefined, yearBuiltMin: undefined, yearBuiltMax: undefined })}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm font-medium",
                active
                  ? "bg-navy text-white"
                  : "bg-secondary text-navy hover:bg-secondary/70",
              )}
              data-ff-appetite-line={tab.key}
            >
              {tab.label}
              <span className={cn("ml-1 text-[10px]", active ? "text-white/80" : "text-muted-foreground")}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-ff-appetite-summary="">
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {lineLabel} rows
          </div>
          <div className="text-lg font-semibold text-navy">{summary.total}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Carriers</div>
          <div className="text-lg font-semibold text-navy">{summary.distinctCarriers}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Deals</div>
          <div className="text-lg font-semibold text-navy">{summary.distinctDeals}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">By result</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {summary.byResult.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              summary.byResult.slice(0, 6).map(([result, count]) => (
                <span
                  key={result}
                  className="rounded-sm border border-border bg-wash px-1.5 py-0.5 text-[10px] font-medium text-navy"
                >
                  {result.replaceAll("_", " ")} {count}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card px-3 py-3"
        method="get"
        data-ff-appetite-filters=""
      >
        <input type="hidden" name="line" value={filters.line} />
        <label className="text-[11px] font-medium text-navy">
          Carrier
          <select
            name="carrier"
            defaultValue={filters.carrierId ?? ""}
            className="mt-1 block h-8 min-w-40 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">All</option>
            {options.carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-medium text-navy">
          County
          <select
            name="county"
            defaultValue={filters.county ?? ""}
            className="mt-1 block h-8 min-w-36 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">All</option>
            {options.counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-medium text-navy">
          Result
          <select
            name="result"
            defaultValue={filters.result ?? ""}
            className="mt-1 block h-8 min-w-36 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">All</option>
            {options.results.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-medium text-navy">
          Year built min
          <input
            name="yearMin"
            type="number"
            defaultValue={filters.yearBuiltMin ?? ""}
            placeholder="e.g. 1980"
            className="mt-1 block h-8 w-28 rounded-md border border-input bg-card px-2 text-sm"
          />
        </label>
        <label className="text-[11px] font-medium text-navy">
          Year built max
          <input
            name="yearMax"
            type="number"
            defaultValue={filters.yearBuiltMax ?? ""}
            placeholder="e.g. 2020"
            className="mt-1 block h-8 w-28 rounded-md border border-input bg-card px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-8 rounded-md bg-navy px-3 text-sm font-medium text-white hover:bg-navy-mid"
        >
          Apply
        </button>
        <Link
          href={`/settings/developer/appetite-log?line=${filters.line}`}
          className="h-8 rounded-md border border-border px-3 text-sm font-medium leading-8 text-navy hover:bg-muted"
        >
          Clear
        </Link>
      </form>

      <section className="ff-card overflow-hidden" data-ff-appetite-sheet="">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No {lineLabel} quote attempt rows match these filters. Run a Gaya/API quote on this line
            to land training data on the right sheet.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="ff-table min-w-[2200px]">
              <thead>
                <tr>
                  {(
                    [
                      "Date",
                      "Carrier",
                      "Line",
                      "Outcome",
                      "Result",
                      "Bindable",
                      "Premium",
                      "Cov A tried",
                      "Cov A forced",
                      "Address/city/county",
                      "Year built",
                      "Roof year",
                      "Roof covering",
                      "Construction",
                      "Occupancy",
                      "Stories",
                      "Pool",
                      "Protection class",
                      "Miles to coast",
                      "Coverage A snap",
                      "Portal Why",
                      "Deal",
                    ] as const
                  ).map((label) => (
                    <th
                      key={label}
                      className="sticky top-0 z-10 whitespace-nowrap !bg-navy !text-white"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const d = datasheetDisplay(row);
                  const outcomeKey = normalizeRiskOutcome(
                    row.quote?.riskOutcome ??
                      inferOutcomeKey(row.log.result, row.log.bindable, row.log.why, row.log.premium),
                  );
                  return (
                    <tr key={row.log.id}>
                      <td className="whitespace-nowrap text-xs">{d.date}</td>
                      <td className="whitespace-nowrap font-medium text-navy">{d.carrier}</td>
                      <td className="whitespace-nowrap text-xs">{d.line}</td>
                      <td className="whitespace-nowrap">
                        {outcomeKey ? (
                          <span
                            className={cn(
                              "inline-flex rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold",
                              riskOutcomePillClass(outcomeKey),
                            )}
                          >
                            {d.outcome}
                          </span>
                        ) : (
                          d.outcome
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs uppercase">{d.result}</td>
                      <td>{d.bindable}</td>
                      <td className="whitespace-nowrap tabular-nums">{d.premium}</td>
                      <td className="whitespace-nowrap tabular-nums">{d.covATried}</td>
                      <td className="whitespace-nowrap tabular-nums">{d.covAForced}</td>
                      <td className="max-w-[14rem] text-xs">{d.address || "—"}</td>
                      <td className="tabular-nums">{d.yearBuilt}</td>
                      <td className="tabular-nums">{d.roofYear}</td>
                      <td className="text-xs">{d.roofCovering}</td>
                      <td className="text-xs">{d.construction}</td>
                      <td className="text-xs">{d.occupancy}</td>
                      <td className="tabular-nums">{d.stories}</td>
                      <td>{d.pool}</td>
                      <td className="text-xs">{d.protectionClass}</td>
                      <td className="tabular-nums">{d.milesToCoast}</td>
                      <td className="tabular-nums">{d.coverageASnap}</td>
                      <td className="max-w-[16rem] text-xs text-muted-foreground">{d.portalWhy}</td>
                      <td className="whitespace-nowrap text-xs">
                        <Link href={d.dealHref} className="font-medium text-primary hover:underline">
                          {d.dealTitle}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SettingsShell>
  );
}

function inferOutcomeKey(
  result: string,
  bindable: boolean,
  why: string | null,
  premium: string | null,
) {
  return inferQuoteOutcomes({ notes: why, result, bindable, premium }).riskOutcome;
}
