import { requestAppetiteQuotesAction, requestStretchQuotesAction } from "@/app/actions/quotes";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { ManualCarrierAdd } from "@/components/deal/manual-carrier-add";
import { ClearDealMarketsButton, MarketsSelectTable } from "@/components/deal/markets-select-table";
import { PaidApiWall } from "@/components/deal/paid-api-wall";
import type { CarrierMatch } from "@/lib/appetite/match";
import { appointmentLabel, isAppointedMatch } from "@/lib/appetite/present";
import { bucketForMatch, hasMarketLookupData, marketBucketLabel } from "@/lib/deals/manual-markets";
import { asList } from "@/lib/safe-list";

export function MarketsPanel({
  dealId,
  matches,
  unlocked = false,
  manualIds = [],
  explicitLookup = false,
  sheetHasValues = false,
  carriers = [],
  dealLine = "HO",
}: {
  dealId: string;
  matches: CarrierMatch[];
  unlocked?: boolean;
  manualIds?: string[];
  explicitLookup?: boolean;
  sheetHasValues?: boolean;
  carriers?: { id: string; name: string; writtenLines?: string[] | null }[];
  dealLine?: string;
}) {
  const manual = new Set(asList(manualIds));
  const matchList = asList(matches);
  const listedIds = matchList.map((row) => row.carrierId);
  const extraManual = asList(carriers)
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
  const rows = [...matchList, ...extraManual];
  const appetite = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "appetite");
  const stretch = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "stretch");
  const skip = rows.filter((row) => bucketForMatch(row.band, manual.has(row.carrierId)) === "skip");
  const appointed = rows.filter((row) => isAppointedMatch(row)).length;
  const displayMatches = explicitLookup || manual.size > 0 ? matchList : [];
  const hasData = hasMarketLookupData(
    displayMatches,
    asList(manualIds),
    explicitLookup,
    sheetHasValues,
  );

  if (!hasData) {
    return (
      <div className="space-y-3" data-ff-deal-markets="" data-ff-markets-empty="">
        <div className="ff-card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-navy">Markets</h3>
          <p className="text-sm text-muted-foreground">
            No carriers on this deal yet. Add who you want to shop from the list below
            (carriers that write this line), or confirm the sheet and request quotes to
            build a fresh list — then remove any you do not want.
          </p>
          <ManualCarrierAdd
            dealId={dealId}
            carriers={carriers}
            alreadyIds={[]}
            dealLine={dealLine}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ff-deal-markets>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {appetite.length} in appetite · {stretch.length} stretch · {skip.length} skip · {appointed}{" "}
          appointed
        </p>
        <form action={requestAppetiteQuotesAction}>
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" size="sm" disabled={appetite.length === 0 || !unlocked}>
            {unlocked ? "Approve & request quotes" : "Approve sheet to request"}
          </Button>
        </form>
      </div>
      {appetite.length > 0 ? (
        <MarketsSelectTable dealId={dealId} title={marketBucketLabel("appetite")} rows={appetite} manualIds={manual} />
      ) : null}
      {stretch.length > 0 ? (
        <MarketsSelectTable dealId={dealId} title={marketBucketLabel("stretch")} rows={stretch} manualIds={manual} />
      ) : null}
      {skip.length > 0 ? (
        <MarketsSelectTable dealId={dealId} title={marketBucketLabel("skip")} rows={skip} manualIds={manual} />
      ) : null}
      <div className="ff-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClearDealMarketsButton dealId={dealId} />
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
    </div>
  );
}
