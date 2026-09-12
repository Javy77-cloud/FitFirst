"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculateAgencyCommission,
  normalizeCommissionSchedule,
  pickScheduleRowForLob,
  type CommissionScheduleRow,
} from "@/lib/carriers/commission";
import { formatMoney } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CalculatorCarrierOption = {
  id: string;
  name: string;
  commissionSchedule: CommissionScheduleRow[];
  newBusinessCommPct: string | null;
  renewalCommPct: string | null;
  writtenLines: string[];
};

export function CommissionCalculatorPanel({
  carriers,
  lines,
  initialCarrierId,
  initialLob,
}: {
  carriers: CalculatorCarrierOption[];
  lines: readonly string[];
  initialCarrierId?: string;
  initialLob?: string;
}) {
  const [carrierId, setCarrierId] = useState(initialCarrierId ?? carriers[0]?.id ?? "");
  const [lob, setLob] = useState(initialLob ?? "");
  const [kind, setKind] = useState<"new" | "renewal">("new");
  const [premiumRaw, setPremiumRaw] = useState("");

  const carrier = carriers.find((c) => c.id === carrierId) ?? null;
  const schedule = useMemo(
    () =>
      carrier
        ? normalizeCommissionSchedule(carrier.commissionSchedule, {
            newBusinessPct: carrier.newBusinessCommPct,
            renewalPct: carrier.renewalCommPct,
          })
        : [],
    [carrier],
  );
  const scheduleRow = pickScheduleRowForLob(schedule, lob || undefined);
  const premium = Number(String(premiumRaw).replace(/[$,\s]/g, ""));
  const result =
    Number.isFinite(premium) && premium >= 0
      ? calculateAgencyCommission({ premium, kind, scheduleRow })
      : null;

  const lobOptions = useMemo(() => {
    const fromSchedule = schedule.map((r) => r.lob.trim()).filter(Boolean);
    const fromWritten = carrier?.writtenLines ?? [];
    return Array.from(new Set([...fromWritten, ...fromSchedule, ...lines])).filter(Boolean);
  }, [schedule, carrier, lines]);

  return (
    <div className="space-y-4" data-ff-carrier-commission-calculator="">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Carrier
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={carrierId}
            onChange={(e) => setCarrierId(e.target.value)}
          >
            {carriers.length === 0 ? <option value="">No Carriers</option> : null}
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Line Of Business
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={lob}
            onChange={(e) => setLob(e.target.value)}
          >
            <option value="">All / Default</option>
            {lobOptions.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Premium
          </span>
          <Input
            className="h-9"
            inputMode="decimal"
            placeholder="e.g. 2500"
            value={premiumRaw}
            onChange={(e) => setPremiumRaw(e.target.value)}
          />
        </label>
        <div className="space-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Rate Type
          </span>
          <div className="flex h-9 gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === "new" ? "default" : "outline"}
              className={kind === "new" ? "bg-[#002868] hover:bg-[#002868]/90" : undefined}
              onClick={() => setKind("new")}
            >
              New Business
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === "renewal" ? "default" : "outline"}
              className={kind === "renewal" ? "bg-[#002868] hover:bg-[#002868]/90" : undefined}
              onClick={() => setKind("renewal")}
            >
              Renewal
            </Button>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-[#002868]/20 bg-slate-50 p-4">
        {!carrier ? (
          <p className="text-sm text-muted-foreground">Select A Carrier To Calculate.</p>
        ) : !scheduleRow ? (
          <p className="text-sm text-muted-foreground">
            No Commission Schedule On This Carrier Yet. Add Rates On The Carrier Record.
          </p>
        ) : !Number.isFinite(premium) || premiumRaw.trim() === "" ? (
          <p className="text-sm text-muted-foreground">Enter Premium To See The Agency Cut.</p>
        ) : !result ? (
          <p className="text-sm text-[#BF0A30]">
            Could Not Parse The {kind === "new" ? "New Business" : "Renewal"} Rate For This Line.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Agency Cut
              </p>
              <p className="text-2xl font-semibold tabular-nums text-[#002868]">
                {formatMoney(result.agencyCut)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Effective Rate
              </p>
              <p className="text-lg font-semibold tabular-nums text-[#002868]">
                {result.effectivePctPoints}%
              </p>
              <p className="text-xs text-muted-foreground">
                Base {result.basePctPoints}%
                {result.bonusPctPoints
                  ? ` + Bonus ${result.bonusPctPoints}%`
                  : " · No Bonus Tier"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Schedule LOB
              </p>
              <p className="text-sm font-medium">{result.scheduleLob}</p>
              <p className="text-xs text-muted-foreground">{result.rateLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Bonus Thresholds
              </p>
              <p className="text-sm">
                {scheduleRow.bonusThresholds?.trim() || "—"}
              </p>
              {result.bonusApplied ? (
                <p className="text-xs text-[#002868]">
                  Applied At {formatMoney(result.bonusApplied.threshold)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {carrier ? (
        <p className="text-xs text-muted-foreground">
          Rates Come From{" "}
          <Link href={`/carriers/${carrier.id}`} className="font-medium text-[#002868] hover:underline">
            {carrier.name}
          </Link>{" "}
          Commission Schedule (New Vs Renewal + Bonus Thresholds).
        </p>
      ) : null}
    </div>
  );
}
