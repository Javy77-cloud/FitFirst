import Link from "next/link";
import {
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "@/lib/carriers/appetite-rows";
import { AppShell } from "@/components/app-shell";
import { MarketCompareTable } from "@/components/carriers/market-compare-table";
import {
  CommissionCalculatorPanel,
  type CalculatorCarrierOption,
} from "@/components/carriers/commission-calculator-panel";
import { buildMarketCompareRows } from "@/lib/carriers/market-compare";
import { normalizeCommissionSchedule } from "@/lib/carriers/commission";
import { listCarriersDesk } from "@/lib/db/queries";
import { LINES } from "@/lib/domain";
import { firstParam } from "@/lib/saved-filters";
import type { CommissionScheduleRow } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function CarrierMarketToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tool = (firstParam(params.tool) ?? "compare").toLowerCase();
  const lob = (firstParam(params.lob) ?? "").trim().toUpperCase();
  const initialCarrierId = firstParam(params.carrier);
  const desk = await listCarriersDesk();

  const compareRows = buildMarketCompareRows(
    desk.map(({ carrier }) => ({
      id: carrier.id,
      name: carrier.name,
      active: carrier.active,
      writtenLines: carrier.writtenLines,
      appetiteNotes: carrier.appetiteNotes,
      dontWriteNotes: carrier.dontWriteNotes,
      appetiteRows: normalizeAppetiteRows((carrier as { appetiteRows?: unknown }).appetiteRows),
      dontWriteRows: normalizeDontWriteRows((carrier as { dontWriteRows?: unknown }).dontWriteRows),
      amBestRating: carrier.amBestRating,
      amBestOutlook: carrier.amBestOutlook,
      commissionSchedule: (carrier.commissionSchedule ?? []) as CommissionScheduleRow[],
      newBusinessCommPct: carrier.newBusinessCommPct,
      renewalCommPct: carrier.renewalCommPct,
    })),
    lob,
  );

  const carriers: CalculatorCarrierOption[] = desk
    .map(({ carrier }) => {
      const schedule = normalizeCommissionSchedule(
        (carrier.commissionSchedule ?? []) as CommissionScheduleRow[],
        {
          newBusinessPct: carrier.newBusinessCommPct,
          renewalPct: carrier.renewalCommPct,
        },
      );
      return {
        id: carrier.id,
        name: carrier.name,
        commissionSchedule: schedule,
        newBusinessCommPct: carrier.newBusinessCommPct,
        renewalCommPct: carrier.renewalCommPct,
        writtenLines: carrier.writtenLines ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const lineOptions = Array.from(
    new Set([...LINES, ...desk.flatMap(({ carrier }) => carrier.writtenLines ?? [])]),
  ).sort((a, b) => a.localeCompare(b));

  const isCalc = tool === "calculator" || tool === "calc";

  return (
    <AppShell
      title={isCalc ? "Commission Calculator" : "Market Comparison"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/carriers"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Back To Carriers
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2" data-ff-carrier-tools-tabs="">
        <Link
          href="/carriers/compare"
          className={
            !isCalc
              ? "inline-flex h-8 items-center rounded-md bg-[#002868] px-3 text-sm font-medium text-white"
              : "inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          }
        >
          Market Comparison
        </Link>
        <Link
          href="/carriers/compare?tool=calculator"
          className={
            isCalc
              ? "inline-flex h-8 items-center rounded-md bg-[#002868] px-3 text-sm font-medium text-white"
              : "inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          }
        >
          Commission Calculator
        </Link>
      </div>

      {isCalc ? (
        <>
          <p className="mb-3 text-base text-muted-foreground">
            Enter Premium To See The Agency Cut From New Vs Renewal Rates Plus Bonus Thresholds On
            The Carrier Commission Schedule.
          </p>
          <section className="ff-card p-4">
            <CommissionCalculatorPanel
              carriers={carriers}
              lines={LINES}
              initialCarrierId={
                initialCarrierId && carriers.some((c) => c.id === initialCarrierId)
                  ? initialCarrierId
                  : undefined
              }
              initialLob={lob || undefined}
            />
          </section>
        </>
      ) : (
        <>
          <p className="mb-3 text-base text-muted-foreground">
            Pick A Line Of Business To See Every Carrier Side By Side — Appetite, Don&apos;t Write,
            Commission Rates, And AM Best.
          </p>
          <form method="get" className="mb-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="tool" value="compare" />
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Line Of Business
              </span>
              <select
                name="lob"
                defaultValue={lob}
                className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Select LOB…</option>
                {lineOptions.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-[#002868] px-3 text-sm font-medium text-white hover:bg-[#002868]/90"
            >
              Compare Markets
            </button>
          </form>
          <section className="ff-card overflow-hidden p-3">
            <MarketCompareTable rows={compareRows} lob={lob} />
          </section>
        </>
      )}
    </AppShell>
  );
}
