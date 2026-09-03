import { recordRenewalCompare, saveProposedTerm } from "@/app/actions/renewal";
import { PremiumChangeSummary } from "@/components/policy/premium-change";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/domain";
import type { Policy, PolicyTerm, RenewalCompareLog } from "@/lib/db/schema";
import {
  coverageRows,
  deductiblesForLine,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";
import { cn } from "@/lib/utils";

function isoDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function ComparePanel({
  policy,
  current,
  proposed,
  logs,
}: {
  policy: Policy;
  current: PolicyTerm | undefined;
  proposed: PolicyTerm | undefined;
  logs: RenewalCompareLog[];
}) {
  const currentPremium = parseMoney(current?.premium);
  const proposedPremium = parseMoney(proposed?.premium);
  const change =
    currentPremium != null && proposedPremium != null
      ? premiumChange(currentPremium, proposedPremium)
      : null;
  const deductibleDefs = deductiblesForLine(policy.lineOfBusiness);
  const rows = coverageRows(current?.coverages, proposed?.coverages);

  return (
    <div className="space-y-4">
      {change ? <PremiumChangeSummary change={change} /> : (
        <section className="ff-card p-4 text-sm text-muted-foreground">
          Record the carrier&apos;s proposed term to see the premium-change summary. FitFirst
          does not rate this policy.
        </section>
      )}

      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Current term</th>
              <th>Proposed term</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-medium">Term</td>
              <td>
                {current
                  ? `${isoDate(current.termEffective)} → ${isoDate(current.termExpiration)}`
                  : "—"}
              </td>
              <td>
                {proposed
                  ? `${isoDate(proposed.termEffective)} → ${isoDate(proposed.termExpiration)}`
                  : "—"}
              </td>
            </tr>
            <tr className={change && change.direction !== "flat" ? "bg-fit-flag-bg/40" : undefined}>
              <td className="font-medium">Premium</td>
              <td>{formatMoney(current?.premium)}</td>
              <td className="font-semibold">{formatMoney(proposed?.premium)}</td>
            </tr>
            {deductibleDefs.map((field) => {
              const left = current?.[field.key] ?? "—";
              const right = proposed?.[field.key] ?? "—";
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
            <h2 className="text-sm font-semibold text-navy">Record proposed term</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter what the carrier sent. This is not a rater and does not invent a risk score.
            </p>
          </div>
          <input type="hidden" name="policyId" value={policy.id} />
          <input type="hidden" name="coverageCount" value={proposed?.coverages.length ?? 0} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Proposed premium</Label>
              <Input
                name="premium"
                required
                defaultValue={proposed?.premium ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Effective</Label>
              <Input
                type="date"
                name="termEffective"
                required
                defaultValue={isoDate(proposed?.termEffective)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Expiration</Label>
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
                <Label className="text-xs">{field.label}</Label>
                <Input
                  name={field.key}
                  defaultValue={proposed?.[field.key] ?? ""}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Key coverages</div>
            {(proposed?.coverages ?? []).map((line, index) => (
              <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <input type="hidden" name={`coverageKey_${index}`} value={line.key} />
                <input type="hidden" name={`coverageLabel_${index}`} value={line.label} />
                <Label className="text-xs sm:col-span-2">{line.label}</Label>
                <Input
                  name={`coverageValue_${index}`}
                  defaultValue={line.value}
                  className="sm:col-span-2"
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" defaultValue={proposed?.notes ?? ""} className="mt-1" />
          </div>
          <Button type="submit" size="sm">
            Save proposed term + log
          </Button>
        </form>

        <section className="ff-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <h2 className="text-sm font-semibold text-navy">Durable compare log</h2>
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
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No compares logged yet. Save a proposed term to write the first row.
            </p>
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
                    <td className="whitespace-nowrap text-xs">
                      {log.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="uppercase text-xs">{log.eventType.replaceAll("_", " ")}</td>
                    <td className="text-xs">{log.summary}</td>
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
