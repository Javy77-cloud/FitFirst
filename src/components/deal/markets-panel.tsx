import { requestAppetiteQuotesAction, requestStretchQuotesAction } from "@/app/actions/quotes";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { ManualCarrierAdd } from "@/components/deal/manual-carrier-add";
import { PaidApiWall } from "@/components/deal/paid-api-wall";
import type { CarrierMatch } from "@/lib/appetite/match";
import { appointmentLabel, isAppointedMatch } from "@/lib/appetite/present";
import { bucketForMatch, marketBucketLabel } from "@/lib/deals/manual-markets";

export function MarketsPanel({
  dealId,
  matches,
  unlocked = false,
  manualIds = [],
  carriers = [],
  dealLine = "HO",
}: {
  dealId: string;
  matches: CarrierMatch[];
  unlocked?: boolean;
  manualIds?: string[];
  carriers?: { id: string; name: string; writtenLines?: string[] | null }[];
  dealLine?: string;
}) {
  const manual = new Set(manualIds);
  const listedIds = matches.map((row) => row.carrierId);
  const extraManual = carriers
    .filter((carrier) => manual.has(carrier.id) && !listedIds.includes(carrier.id))
    .map(
      (carrier): CarrierMatch => ({
        carrierId: carrier.id,
        carrierName: carrier.name,
        band: "red",
        fitScore: 0,
        reasons: [{ code: "manual", message: "Added by agent", severity: "stretch" }],
        learnedDecline: false,
        shoppable: true,
      }),
    );
  const rows = [...matches, ...extraManual];
  const appetite = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "appetite");
  const stretch = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "stretch");
  const skip = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "skip");
  const appointed = rows.filter((row) => isAppointedMatch(row)).length;

  return (
    <div className="space-y-4">
      <div className="ff-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-navy">Appetite, then submit</h3>
            <p className="text-base text-muted-foreground">
              {appetite.length} in appetite · {stretch.length} stretch · {skip.length} skip · {appointed}{" "}
              appointed. One button submits the confirmed sheet to every in-appetite carrier.
              Stretch is a second pass.
            </p>
          </div>
          <form action={requestAppetiteQuotesAction}>
            <input type="hidden" name="dealId" value={dealId} />
            <Button type="submit" size="sm" disabled={appetite.length === 0 || !unlocked}>
              {unlocked ? "Approve & request quotes" : "Approve sheet to request"}
            </Button>
          </form>
        </div>
        <ManualCarrierAdd
          dealId={dealId}
          carriers={carriers}
          alreadyIds={rows.map((row) => row.carrierId)}
          dealLine={dealLine}
        />
        <form action={requestStretchQuotesAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" size="sm" variant="outline" disabled={stretch.length === 0 || !unlocked}>
            Request stretch quotes
          </Button>
          <span className="text-helper text-muted-foreground">Manual second pass. Does not replace in-appetite stubs.</span>
        </form>
        <PaidApiWall />
      </div>
      <MarketTable
        title={marketBucketLabel("appetite")}
        rows={appetite}
        manualIds={manual}
        empty="No in-appetite markets. Add a carrier manually to override."
      />
      <MarketTable
        title={marketBucketLabel("stretch")}
        rows={stretch}
        manualIds={manual}
        empty="No stretch markets."
      />
      <MarketTable title={marketBucketLabel("skip")} rows={skip} manualIds={manual} empty="Nothing to skip." />
    </div>
  );
}

function MarketTable({
  title,
  rows,
  empty,
  manualIds,
}: {
  title: string;
  rows: CarrierMatch[];
  empty: string;
  manualIds: Set<string>;
}) {
  return (
    <section className="ff-card overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">{title}</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">{empty}</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Appointment</th>
              <th>Fit</th>
              <th>Score</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.carrierId}>
                <td className="font-medium">
                  {row.carrierName}
                  {manualIds.has(row.carrierId) ? (
                    <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy">
                      manual
                    </span>
                  ) : null}
                  {row.learnedDecline ? (
                    <div className="text-helper text-fit-red">Learned from decline log</div>
                  ) : null}
                </td>
                <td>{appointmentLabel(row)}</td>
                <td>
                  <FitBadge band={row.band} />
                </td>
                <td>{row.fitScore}</td>
                <td className="text-xs">
                  {row.reasons
                    .filter((r) => r.severity !== "pass")
                    .map((r) => r.message)
                    .join(" · ") || "Clears structured appetite."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
