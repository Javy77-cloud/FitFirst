import { recordRenewalCompare, saveProposedTerm } from "@/app/actions/renewal";
import { ClientStayingButton } from "@/components/renewals/client-staying-button";
import { FillCompareFromDecsButton } from "@/components/policy/fill-compare-from-decs-button";
import { PremiumChangeSummary } from "@/components/policy/premium-change";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatMoney } from "@/lib/domain";
import type {
  Policy,
  PolicyCoverageLine,
  PolicyTerm,
  RenewalCompareLog,
  RenewalCompareSnapshot,
} from "@/lib/db/schema";
import {
  coverageRows,
  deductiblesForLine,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";
import { cn } from "@/lib/utils";

function coverageList(
  value: PolicyCoverageLine[] | Record<string, string> | null | undefined,
): PolicyCoverageLine[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, lineValue]) => ({ key, label: key, value: lineValue }));
}

function isoDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function ComparePanel({
  policy,
  current,
  proposed,
  logs,
  compareBaseline,
  compareRenewal,
  baselineLabel = "Current term",
  renewalLabel = "Proposed term",
  renewalHandled = false,
  frozenSnapshot = null,
}: {
  policy: Policy;
  current: PolicyTerm | undefined;
  proposed: PolicyTerm | undefined;
  logs: RenewalCompareLog[];
  /** Displayed left column. Defaults to the current term (unstamped compare). */
  compareBaseline?: PolicyTerm;
  /** Displayed right column. Defaults to the proposed term (unstamped compare). */
  compareRenewal?: PolicyTerm;
  baselineLabel?: string;
  renewalLabel?: string;
  /** Client staying already pushed — do not show the chase control again. */
  renewalHandled?: boolean;
  /** Old vs new frozen when Client staying was pushed. Wins over live roles. */
  frozenSnapshot?: RenewalCompareSnapshot | null;
}) {
  const frozen = frozenSnapshot ?? null;
  const baseline = frozen ? undefined : (compareBaseline ?? current);
  const renewal = frozen ? undefined : (compareRenewal ?? proposed);
  const shownBaselineLabel = frozen?.baselineLabel || baselineLabel;
  const shownRenewalLabel = frozen?.renewalLabel || renewalLabel;
  const currentPremium = parseMoney(frozen ? frozen.currentPremium : baseline?.premium);
  const proposedPremium = parseMoney(frozen ? frozen.proposedPremium : renewal?.premium);
  const change =
    currentPremium != null && proposedPremium != null
      ? premiumChange(currentPremium, proposedPremium)
      : null;
  const deductibleDefs = deductiblesForLine(policy.lineOfBusiness);
  const rows = frozen ? frozen.coverageRows : coverageRows(baseline?.coverages, renewal?.coverages);

  return (
    <div className="space-y-4">
      <section className="ff-card flex flex-wrap items-center gap-3 p-4">
        <FillCompareFromDecsButton policyId={policy.id} />
        {renewalHandled ? null : (
          <ClientStayingButton policyId={policy.id} renewalDate={policy.renewalDate} size="sm" />
        )}

      </section>
      {change ? <PremiumChangeSummary change={change} /> : shownBaselineLabel === "Prior term" || shownBaselineLabel === "Old term" ? (
        <section className="ff-card p-4 text-base text-muted-foreground">
          Prior term and current term are open for compare. Premium change shows once both
          terms have a premium. FitFirst does not rate this policy.
        </section>
      ) : (
        <section className="ff-card p-4 text-base text-muted-foreground">
          Record the carrier&apos;s proposed term to see the premium-change summary. FitFirst
          does not rate this policy.
        </section>
      )}

      {frozen ? (
        <p className="text-sm text-muted-foreground" data-ff-compare-frozen-note="">
          Frozen when Client staying was pushed. Compare reopens this old-vs-new snapshot after
          the prior term flips.
        </p>
      ) : null}
      <section className="ff-card overflow-x-auto" data-ff-compare-frozen={frozen ? "true" : "false"}>
        <table className="ff-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>{shownBaselineLabel}</th>
              <th>{shownRenewalLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-medium">Term</td>
              <td>
                {frozen?.currentTermEffective
                  ? `${formatDay(frozen.currentTermEffective)} → ${formatDay(frozen.currentTermExpiration)}`
                  : baseline
                    ? `${formatDay(baseline.termEffective)} → ${formatDay(baseline.termExpiration)}`
                    : "—"}
              </td>
              <td>
                {frozen?.proposedTermEffective
                  ? `${formatDay(frozen.proposedTermEffective)} → ${formatDay(frozen.proposedTermExpiration)}`
                  : renewal
                    ? `${formatDay(renewal.termEffective)} → ${formatDay(renewal.termExpiration)}`
                    : "—"}
              </td>
            </tr>
            <tr className={change && change.direction !== "flat" ? "bg-fit-flag-bg/40" : undefined}>
              <td className="font-medium">Premium</td>
              <td>{formatMoney(frozen ? frozen.currentPremium : baseline?.premium)}</td>
              <td className="font-semibold">{formatMoney(frozen ? frozen.proposedPremium : renewal?.premium)}</td>
            </tr>
            {deductibleDefs.map((field) => {
              const left = frozen
                ? (frozen.currentDeductibles?.[field.key] || "—")
                : (baseline?.[field.key] ?? "—");
              const right = frozen
                ? (frozen.proposedDeductibles?.[field.key] || "—")
                : (renewal?.[field.key] ?? "—");
              const changed = left !== right;
              return (
                <tr key={field.key} className={cn(changed && "bg-fit-flag-bg/40")}>
                  <td className="font-medium">{field.label}</td>
                  <td>{left}</td>
                  <td>{right}</td>
                </tr>
              );
            })}
            {rows.map((row) => (
              <tr key={row.key} className={cn(row.changed && "bg-fit-flag-bg/40")}>
                <td className="font-medium">{row.label}</td>
                <td>{row.currentValue}</td>
                <td>{row.proposedValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={saveProposedTerm} className="ff-card space-y-3 p-4">
          <div>
            <h2 className="text-base font-semibold text-navy">Record proposed term</h2>

          </div>
          <input type="hidden" name="policyId" value={policy.id} />
          <input type="hidden" name="coverageCount" value={coverageList(proposed?.coverages).length} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[0.8125rem]">Proposed premium</Label>
              <Input
                name="premium"
                required
                defaultValue={proposed?.premium ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[0.8125rem]">Effective</Label>
              <Input
                type="date"
                name="termEffective"
                required
                defaultValue={isoDate(proposed?.termEffective)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[0.8125rem]">Expiration</Label>
              <Input
                type="date"
                name="termExpiration"
                required
                defaultValue={isoDate(proposed?.termExpiration)}
                className="mt-1"
              />
            </div>
            {deductibleDefs.map((field) => (
              <div key={field.key}>
                <Label className="text-[0.8125rem]">{field.label}</Label>
                <Input
                  name={field.key}
                  defaultValue={proposed?.[field.key] ?? ""}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-[0.8125rem] font-medium text-muted-foreground">Key coverages</div>
            {coverageList(proposed?.coverages).map((line, index) => (
              <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <input type="hidden" name={`coverageKey_${index}`} value={line.key} />
                <input type="hidden" name={`coverageLabel_${index}`} value={line.label} />
                <Label className="text-[0.8125rem] sm:col-span-2">{line.label}</Label>
                <Input
                  name={`coverageValue_${index}`}
                  defaultValue={line.value}
                  className="sm:col-span-2"
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-[0.8125rem]">Notes</Label>
            <Textarea name="notes" defaultValue={proposed?.notes ?? ""} className="mt-1" />
          </div>
          <Button type="submit" size="sm">
            Save proposed term + log
          </Button>
        </form>

        <section className="ff-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <h2 className="text-base font-semibold text-navy">Durable compare log</h2>
            {current && proposed ? (
              <form action={recordRenewalCompare}>
                <input type="hidden" name="policyId" value={policy.id} />
                <Button type="submit" size="xs" variant="outline">
                  Log this compare
                </Button>
              </form>
            ) : null}
          </div>
          {logs.length === 0 ? (
            <p className="px-4 py-6 text-base text-muted-foreground">No compares logged yet.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-[0.8125rem]">
                      {formatDay(log.createdAt)}
                    </td>
                    <td className="uppercase text-[0.8125rem]">{log.eventType.replaceAll("_", " ")}</td>
                    <td className="text-[0.8125rem]">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
