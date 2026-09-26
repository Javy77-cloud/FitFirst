"use client";

import { OutsideFitFirstStamp } from "@/components/deal/outside-fitfirst-stamp";
import { useState } from "react";
import { requestAppetiteQuotesAction, requestStretchQuotesAction } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { ManualCarrierAdd } from "@/components/deal/manual-carrier-add";
import { LoadShopListButton } from "@/components/deal/load-shop-list-button";
import { ClearDealMarketsButton, MarketsSelectTable } from "@/components/deal/markets-select-table";
import { PaidApiWall } from "@/components/deal/paid-api-wall";
import type { CarrierMatch } from "@/lib/appetite/match";
import { isAppointedMatch } from "@/lib/appetite/present";
import { bucketForMatch, hasMarketLookupData, marketBucketLabel } from "@/lib/deals/manual-markets";
import { presentProductLabel } from "@/lib/deals/product-chip-label";
import { asList } from "@/lib/safe-list";

export function MarketsPanel({
  dealId,
  matches,
  unlocked = false,
  manualIds = [],
  shopListIds = [],
  explicitLookup = false,
  sheetHasValues = false,
  carriers = [],
  dealLine = "HO",
  shopLine,
  product,
  productLabel,
  lastRequestCarrierIds = [],
  outsideOverride = false,
  outsideOverrideDetail = null,
}: {
  dealId: string;
  matches: CarrierMatch[];
  unlocked?: boolean;
  manualIds?: string[];
  /** Curated Home/Auto/Flood list — overlay structured appetite instead of forcing In appetite. */
  shopListIds?: string[];
  explicitLookup?: boolean;
  sheetHasValues?: boolean;
  carriers?: { id: string; name: string; writtenLines?: string[] | null }[];
  dealLine?: string;
  shopLine?: string;
  product?: string;
  productLabel?: string | null;
  lastRequestCarrierIds?: string[];
  outsideOverride?: boolean;
  outsideOverrideDetail?: import("@/lib/deals/outside-stage-override").OutsideStageOverride | null;
}) {
  const visibleProduct = presentProductLabel(productLabel);
  const [selected, setSelected] = useState<string[]>(() =>
    lastRequestCarrierIds.map((id) => id.trim()).filter(Boolean),
  );
  const manual = new Set(asList(manualIds));
  const shopList = new Set(asList(shopListIds));
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
  const matchedIds = new Set(matchList.map((row) => row.carrierId));
  const appetite = rows.filter(
    (row) =>
      bucketForMatch(
        row.band,
        manual.has(row.carrierId),
        shopList.has(row.carrierId) && matchedIds.has(row.carrierId),
      ) === "appetite",
  );
  const stretch = rows.filter(
    (row) =>
      bucketForMatch(
        row.band,
        manual.has(row.carrierId),
        shopList.has(row.carrierId) && matchedIds.has(row.carrierId),
      ) === "stretch",
  );
  const skip = rows.filter(
    (row) =>
      bucketForMatch(
        row.band,
        manual.has(row.carrierId),
        shopList.has(row.carrierId) && matchedIds.has(row.carrierId),
      ) === "skip",
  );
  const appointed = rows.filter((row) => isAppointedMatch(row)).length;
  const hasData = hasMarketLookupData(
    matchList,
    asList(manualIds),
    explicitLookup,
    sheetHasValues,
  );

  const appetiteIdSet = new Set(appetite.map((row) => row.carrierId));
  const stretchIdSet = new Set(stretch.map((row) => row.carrierId));
  const selectedAppetiteCount = selected.filter((id) => appetiteIdSet.has(id)).length;
  const selectedStretchCount = selected.filter((id) => stretchIdSet.has(id)).length;
  // When any rows are checked, both shop forms send the full selection; the
  // server intersects with pass rules (empty intersect → shop none).
  const shopCarrierIds = selected.length > 0 ? selected : [];

  if (!hasData) {
    return (
      <div className="space-y-3" data-ff-deal-markets="" data-ff-markets-empty="">
        <div className="ff-card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-navy">
            {visibleProduct ? `Markets · ${visibleProduct}` : "Markets"}
          </h3>
          {outsideOverride ? (
            <OutsideFitFirstStamp
              override={
                outsideOverrideDetail ?? {
                  reason: "Quoted outside FitFirst",
                  at: "",
                  toStage: "policy_issued",
                }
              }
              variant="hero"
            />
          ) : null}
          <p className="text-sm text-muted-foreground" data-ff-deal-markets-stats="">
            0 in appetite · 0 stretch · 0 skip · 0 appointed
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LoadShopListButton dealId={dealId} dealLine={dealLine} line={shopLine} product={product} />
          </div>
          <ManualCarrierAdd
            dealId={dealId}
            carriers={carriers}
            alreadyIds={[]}
            dealLine={dealLine}
            line={shopLine}
            product={product}
          />
        </div>
      </div>
    );
  }

  const approveLabel =
    unlocked
      ? selectedAppetiteCount > 0
        ? `Request Quotes (${selectedAppetiteCount})`
        : "Request Quotes"
      : "Request Quotes";
  const stretchLabel =
    selectedStretchCount > 0
      ? `Request Stretch Quotes (${selectedStretchCount})`
      : "Request Stretch Quotes";

  const appetiteToolbar = (
    <>
      <p className="text-sm text-muted-foreground">
        {appetite.length} in appetite · {stretch.length} stretch · {skip.length} skip · {appointed}{" "}
        appointed
      </p>
      <form action={requestAppetiteQuotesAction}>
        <input type="hidden" name="dealId" value={dealId} />
        {shopLine ? <input type="hidden" name="line" value={shopLine} /> : null}
        {product ? <input type="hidden" name="product" value={product} /> : null}
        {shopCarrierIds.map((id) => (
          <input key={`appetite-${id}`} type="hidden" name="carrierId" value={id} />
        ))}
        <Button type="submit" size="sm" disabled={appetite.length === 0 || !unlocked}>
          {approveLabel}
        </Button>
      </form>
    </>
  );

  const marketsLead = visibleProduct ? `Markets · ${visibleProduct}` : null;

  return (
    <div className="space-y-3" data-ff-deal-markets="">
      {appetite.length > 0 ? (
        <MarketsSelectTable
          dealId={dealId}
          line={shopLine}
          product={product}
          title={marketBucketLabel("appetite")}
          rows={appetite}
          manualIds={manual}
          selected={selected}
          onSelectedChange={setSelected}
          toolbar={appetiteToolbar}
          lead={marketsLead}
        />
      ) : (
        <div className="ff-card space-y-3 p-4" data-ff-deal-markets-stats="">
          {marketsLead ? <h3 className="text-sm font-semibold text-navy">{marketsLead}</h3> : null}
          {appetiteToolbar}
        </div>
      )}
      {stretch.length > 0 ? (
        <MarketsSelectTable
          dealId={dealId}
          line={shopLine}
          product={product}
          title={marketBucketLabel("stretch")}
          rows={stretch}
          manualIds={manual}
          selected={selected}
          onSelectedChange={setSelected}
        />
      ) : null}
      {skip.length > 0 ? (
        <MarketsSelectTable
          dealId={dealId}
          line={shopLine}
          product={product}
          title={marketBucketLabel("skip")}
          rows={skip}
          manualIds={manual}
          selected={selected}
          onSelectedChange={setSelected}
        />
      ) : null}
      <div className="ff-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <LoadShopListButton dealId={dealId} dealLine={dealLine} line={shopLine} product={product} />
          <ClearDealMarketsButton dealId={dealId} line={shopLine} product={product} />
        </div>
        <ManualCarrierAdd
          dealId={dealId}
          carriers={carriers}
          alreadyIds={rows.map((row) => row.carrierId)}
          dealLine={dealLine}
          line={shopLine}
          product={product}
        />
        <form action={requestStretchQuotesAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          {shopLine ? <input type="hidden" name="line" value={shopLine} /> : null}
          {product ? <input type="hidden" name="product" value={product} /> : null}
          {shopCarrierIds.map((id) => (
            <input key={`stretch-${id}`} type="hidden" name="carrierId" value={id} />
          ))}
          <Button type="submit" size="sm" variant="outline" disabled={stretch.length === 0 || !unlocked}>
            {stretchLabel}
          </Button>
        </form>
        <PaidApiWall />
      </div>
    </div>
  );
}
