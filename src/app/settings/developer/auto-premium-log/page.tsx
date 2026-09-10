import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import {
  datasheetDisplay,
  filtersToSearchParams,
  parseAutoPremiumDatasheetFilters,
  summarizeAutoPremiumRows,
} from "@/lib/appetite/auto-premium-learning";
import {
  listAutoPremiumLearningFilterOptions,
  listAutoPremiumLearningLogs,
} from "@/lib/db/queries";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DeveloperAutoPremiumLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSiteDeveloperPage();
  const query = await searchParams;
  const filters = parseAutoPremiumDatasheetFilters(query);
  const [rows, options] = await Promise.all([
    listAutoPremiumLearningLogs(filters),
    listAutoPremiumLearningFilterOptions(),
  ]);
  const summary = summarizeAutoPremiumRows(rows);

  return (
    <SettingsShell
      title="Auto Premium Learning"
      current="developer"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/developer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Developer Hub
          </Link>
          <Link
            href="/settings/developer/appetite-log?line=AUTO"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Appetite Log (Auto tab)
          </Link>
        </div>
      }
    >
      <p className="mb-3 max-w-4xl text-sm text-muted-foreground" data-ff-auto-premium-intro="">
        Developer-only Auto premium-learning datasheet —{" "}
        <strong className="text-navy">not</strong> Home appetite decline rules. Every Auto Gaya/API
        quote write should land a row with a full application feature snapshot (driver, ZIP,
        vehicle, record) plus carrier premium / outcome. Ranking helper is{" "}
        <span className="font-semibold text-navy">shadow/stub</span> until sample size grows. Same
        site-dev gate as Appetite Log (<code className="text-xs">FF_SITE_DEVELOPER_EMAILS</code>).
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" data-ff-auto-premium-summary="">
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</div>
          <div className="text-lg font-semibold text-navy">{summary.total}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">With snapshot</div>
          <div className="text-lg font-semibold text-navy">{summary.withSnapshot}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">With premium</div>
          <div className="text-lg font-semibold text-navy">{summary.withPremium}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Carriers</div>
          <div className="text-lg font-semibold text-navy">{summary.distinctCarriers}</div>
        </div>
        <div className="ff-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Deals</div>
          <div className="text-lg font-semibold text-navy">{summary.distinctDeals}</div>
        </div>
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card px-3 py-3"
        method="get"
        data-ff-auto-premium-filters=""
      >
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
          City
          <select
            name="city"
            defaultValue={filters.city ?? ""}
            className="mt-1 block h-8 min-w-36 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">All</option>
            {options.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-medium text-navy">
          Vehicle year min
          <input
            name="yearMin"
            type="number"
            defaultValue={filters.vehicleYearMin ?? ""}
            placeholder="e.g. 2018"
            className="mt-1 block h-8 w-28 rounded-md border border-input bg-card px-2 text-sm"
          />
        </label>
        <label className="text-[11px] font-medium text-navy">
          Vehicle year max
          <input
            name="yearMax"
            type="number"
            defaultValue={filters.vehicleYearMax ?? ""}
            placeholder="e.g. 2026"
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
          href="/settings/developer/auto-premium-log"
          className="h-8 rounded-md border border-border px-3 text-sm font-medium leading-8 text-navy hover:bg-muted"
        >
          Clear
        </Link>
      </form>

      <section className="ff-card overflow-hidden" data-ff-auto-premium-sheet="">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No Auto premium-learning rows yet. Run a Gaya/API Auto quote to land a snapshot + premium
            row{filtersToSearchParams(filters) ? " (or clear filters)" : ""}.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="ff-table min-w-[2000px]">
              <thead>
                <tr>
                  {(
                    [
                      "Date",
                      "Carrier",
                      "Premium",
                      "Result",
                      "Bindable",
                      "Quote #",
                      "State",
                      "City",
                      "ZIP",
                      "Driver age",
                      "Gender",
                      "Vehicle year",
                      "Make",
                      "Model",
                      "VIN",
                      "Ownership",
                      "Annual miles",
                      "Usage",
                      "Rideshare",
                      "Commute days",
                      "Accidents 3yr",
                      "Violations 3yr",
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
                  return (
                    <tr key={row.log.id}>
                      <td className="whitespace-nowrap text-xs">{d.date}</td>
                      <td className="whitespace-nowrap font-medium text-navy">{d.carrier}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {d.premium != null && String(d.premium).trim() !== ""
                          ? formatMoney(d.premium)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap text-xs uppercase">{d.result}</td>
                      <td>{d.bindable}</td>
                      <td className="whitespace-nowrap text-xs">{d.quoteNumber || "—"}</td>
                      <td className="text-xs">{d.state}</td>
                      <td className="text-xs">{d.city}</td>
                      <td className="text-xs tabular-nums">{d.zip}</td>
                      <td className="tabular-nums">{d.driverAge}</td>
                      <td className="text-xs">{d.gender}</td>
                      <td className="tabular-nums">{d.vehicleYear}</td>
                      <td className="text-xs">{d.make}</td>
                      <td className="text-xs">{d.model}</td>
                      <td className="font-mono text-[10px]">{d.vin}</td>
                      <td className="text-xs">{d.ownership}</td>
                      <td className="text-xs">{d.annualMiles}</td>
                      <td className="text-xs">{d.usage}</td>
                      <td className="text-xs">{d.rideshare}</td>
                      <td className="text-xs">{d.commuteDays}</td>
                      <td className="text-xs">{d.accidents}</td>
                      <td className="text-xs">{d.violations}</td>
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
