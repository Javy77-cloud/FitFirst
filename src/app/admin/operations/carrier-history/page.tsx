import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { listFillLearningLogs, listQuoteLogs } from "@/lib/db/queries";
import { saveCarrierHistoryRule } from "@/app/actions/deal-desk";
import {
  groupCarrierHistory,
  historyConfidence,
  HISTORY_CONFIDENCE_LABEL,
  historyToneClass,
} from "@/lib/deals/carrier-history";

export const dynamic = "force-dynamic";

export default async function CarrierHistoryPage() {
  await requireAdminPage();
  const [logs, rules] = await Promise.all([listQuoteLogs(), listFillLearningLogs()]);
  const rows = groupCarrierHistory(
    logs.map(({ log, carrier }) => ({
      carrierId: log.carrierId,
      carrierName: carrier.name,
      lineOfBusiness: log.lineOfBusiness,
      attemptedAt: log.attemptedAt,
      why: log.why,
      snap: {
        snapYearBuilt: log.snapYearBuilt,
        snapRoofYear: log.snapRoofYear,
        snapRoofCovering: log.snapRoofCovering,
        snapConstruction: log.snapConstruction,
        snapOpeningProtection: log.snapOpeningProtection,
        snapOccupancy: log.snapOccupancy,
        snapStories: log.snapStories,
        snapPool: log.snapPool,
        snapProtectionClass: log.snapProtectionClass,
        snapMilesToCoast: log.snapMilesToCoast,
        snapCity: log.snapCity,
        snapCounty: log.snapCounty,
        snapCoverageA: log.snapCoverageA,
        premium: log.premium,
        quoteNumber: log.quoteNumber,
      },
    })),
    rules.map(({ log }) => ({
      carrierId: log.carrierId,
      shopLine: log.shopLine,
      loggedAt: log.loggedAt,
      fieldKey: log.fieldKey,
    })),
  );

  return (
    <AppShell title="Carrier history" eyebrow="Operations">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin only. One row per carrier per line. Green is verified, yellow is a single source,
        red is an override stored as a rule — the next pull applies it. Values on a quote are
        not patched here.
      </p>

      {rows.length === 0 ? (
        <section className="ff-card px-4 py-8 text-sm text-muted-foreground">
          No carrier pulls logged yet. Request quotes from a deal, then corrections land here.
        </section>
      ) : (
        <section className="ff-card overflow-hidden">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Line</th>
                <th>Last pull</th>
                <th>Fields captured</th>
                <th>Confidence</th>
                <th>Correct</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const confidence = historyConfidence(row);
                return (
                  <tr key={`${row.carrierId}:${row.lineOfBusiness}`}>
                    <td className="font-medium">{row.carrierName}</td>
                    <td>{row.lineOfBusiness}</td>
                    <td className="whitespace-nowrap text-xs">
                      {row.lastPullAt
                        ? new Date(row.lastPullAt).toISOString().slice(0, 10)
                        : "—"}
                      <div className="text-muted-foreground">{row.pullCount} pull{row.pullCount === 1 ? "" : "s"}</div>
                    </td>
                    <td className="text-xs">{row.fieldsCaptured.join(", ") || "—"}</td>
                    <td>
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${historyToneClass(confidence)}`}>
                        {HISTORY_CONFIDENCE_LABEL[confidence]}
                      </span>
                    </td>
                    <td>
                      <form action={saveCarrierHistoryRule} className="grid min-w-[14rem] gap-1">
                        <input type="hidden" name="carrierId" value={row.carrierId} />
                        <input type="hidden" name="lineOfBusiness" value={row.lineOfBusiness} />
                        <Label className="text-[10px] uppercase text-muted-foreground">Field</Label>
                        <Input name="fieldKey" defaultValue="premium" className="h-7 text-xs" />
                        <Label className="text-[10px] uppercase text-muted-foreground">Pulled</Label>
                        <Input name="extractedValue" className="h-7 text-xs" placeholder="What the pull showed" />
                        <Label className="text-[10px] uppercase text-muted-foreground">Correct value</Label>
                        <Input name="correctedValue" required className="h-7 text-xs" placeholder="Rule for next pull" />
                        <Button type="submit" size="xs">
                          Save rule
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </AppShell>
  );
}
