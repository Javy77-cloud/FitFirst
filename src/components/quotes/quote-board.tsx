"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { runDeskMacro } from "@/app/actions/developer-hub";
import { QuoteCard } from "@/components/quotes/quote-card";
import { ExpandCollapseControl } from "@/components/quotes/expand-collapse";
import { ShopSummary } from "@/components/quotes/tracking-table";
import { StagePill } from "@/components/fit-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { compareHref, quoteCompareId, selectedSameDeal } from "@/lib/quotes/board";
import { quoteCardDefaultOpen, shopSectionOpen } from "@/lib/quotes/collapse";
import type { TrackingRow, TrackingShop } from "@/lib/quotes/tracking";
import { matchesContains } from "@/lib/search/live-query";
import { cn } from "@/lib/utils";

function shopMatches(shop: TrackingShop, query: string) {
  if (matchesContains(query, shop.dealTitle, shop.dealStage, shop.line)) return true;
  return shop.rows.some((row) =>
    matchesContains(query, row.carrierName, row.quoteNumber, row.status, row.notes, row.email, row.phone),
  );
}

export function QuoteBoard({
  shops,
  focusedDeal = false,
  initialQuery = "",
  macros = [],
}: {
  shops: TrackingShop[];
  focusedDeal?: boolean;
  initialQuery?: string;
  macros?: Array<{ id: string; name: string }>;
}) {
  const liveQuery = useLiveContainsQuery("quotes", initialQuery);
  const visibleShops = useMemo(
    () => shops.filter((shop) => shopMatches(shop, liveQuery)),
    [liveQuery, shops],
  );
  const allRows = useMemo(() => visibleShops.flatMap((shop) => shop.rows), [visibleShops]);
  const [openShops, setOpenShops] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(shops.map((shop) => [shop.dealId, shopSectionOpen(shop, focusedDeal)])),
  );
  const [openQuotes, setOpenQuotes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allRows.map((row) => [row.id, quoteCardDefaultOpen(row, focusedDeal)])),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [macroId, setMacroId] = useState(macros[0]?.id ?? "");
  const [macroMessage, setMacroMessage] = useState<string | null>(null);
  const [macroBusy, setMacroBusy] = useState(false);

  const selectedRows = allRows.filter((row) => selected.includes(row.id));
  const compareDealId = selectedSameDeal(selectedRows);
  const compareIds = selectedRows.map(quoteCompareId);
  const allQuotesExpanded = allRows.length > 0 && allRows.every((row) => openQuotes[row.id]);

  function toggleShop(dealId: string) {
    setOpenShops((current) => ({ ...current, [dealId]: !current[dealId] }));
  }

  function toggleQuote(id: string) {
    setOpenQuotes((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleSelect(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function setShopQuotes(shop: TrackingShop, open: boolean) {
    setOpenQuotes((current) => {
      const next = { ...current };
      for (const row of shop.rows) next[row.id] = open;
      return next;
    });
  }

  function selectShop(shop: TrackingShop, on: boolean) {
    const ids = new Set(shop.rows.map((row) => row.id));
    setSelected((current) =>
      on ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.has(id)),
    );
  }

  function selectAll(on: boolean) {
    setSelected(on ? allRows.map((row) => row.id) : []);
  }

  async function runQuoteMacro() {
    const recordIds = [
      ...new Set(selectedRows.map((row) => row.quoteId || row.dealId).filter((id): id is string => Boolean(id))),
    ];
    if (!macroId || recordIds.length === 0) {
      setMacroMessage("Tick one or more quotes, then run a Settings macro.");
      return;
    }
    setMacroBusy(true);
    const form = new FormData();
    form.set("macroId", macroId);
    form.set("module", "quotes");
    for (const id of recordIds) form.append("recordId", id);
    const result = await runDeskMacro(form);
    setMacroMessage(result.summary);
    setMacroBusy(false);
  }

  function expandAll(open: boolean) {
    setOpenQuotes(Object.fromEntries(allRows.map((row) => [row.id, open])));
    if (open) {
      setOpenShops(Object.fromEntries(shops.map((shop) => [shop.dealId, true])));
    }
  }

  return (
    <div className="space-y-4">
      <section className="ff-card px-4 py-3" data-testid="quotes-bulk-bar">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm font-semibold text-navy">Bulk</p>
          <button type="button" className={cn(buttonVariants({ size: "xs", variant: "outline" }))} onClick={() => selectAll(true)}>
            Select all
          </button>
          <button type="button" className={cn(buttonVariants({ size: "xs", variant: "outline" }))} onClick={() => selectAll(false)}>
            Clear selection
          </button>
          <ExpandCollapseControl
            expanded={allQuotesExpanded}
            onExpand={() => expandAll(true)}
            onCollapse={() => expandAll(false)}
            expandLabel="Expand all quotes"
            collapseLabel="Collapse all quotes"
            testId="quotes-expand-all"
          />
          {compareDealId && selectedRows.length > 0 ? (
            <Link
              href={compareHref(compareDealId, compareIds)}
              className={cn(buttonVariants({ size: "xs" }))}
            >
              Compare selected ({selectedRows.length})
            </Link>
          ) : (
            <span className={cn(buttonVariants({ size: "xs", variant: "outline" }), "cursor-not-allowed opacity-50")}>
              Compare selected
            </span>
          )}
          {macros.length ? (
            <>
              <select
                value={macroId}
                onChange={(event) => setMacroId(event.target.value)}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs"
              >
                {macros.map((macro) => (
                  <option key={macro.id} value={macro.id}>
                    {macro.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" disabled={macroBusy} onClick={() => void runQuoteMacro()}>
                Run Macro
              </Button>
            </>
          ) : (
            <a href="/settings/developer-hub/macros" className="text-xs text-primary hover:underline">
              No quote macros — open Settings → Macros
            </a>
          )}
          <span className="text-xs text-muted-foreground">
            {selectedRows.length === 0
              ? "Tick quotes to compare or run a Settings macro. Compare, PDF, email, SMS, open deal, and appetite log live in each card’s Actions menu."
              : compareDealId
                ? `${selectedRows.length} selected on one shop.`
                : `${selectedRows.length} selected across shops — pick one deal to compare.`}
          </span>
        </div>
        {macroMessage ? <p className="mt-2 text-sm text-navy">{macroMessage}</p> : null}
      </section>

      {visibleShops.length === 0 ? (
        <section className="ff-card px-4 py-8 text-base text-muted-foreground">
          {liveQuery.trim()
            ? `No shops containing “${liveQuery.trim()}”.`
            : "No quote attempts on the book yet. Open a deal, filter markets, then log the shop."}
        </section>
      ) : null}

      {visibleShops.map((shop) => {
        const shopOpen = openShops[shop.dealId] ?? true;
        const shopSelected = shop.rows.filter((row) => selected.includes(row.id)).length;
        const shopQuotesExpanded =
          shop.rows.length > 0 && shop.rows.every((row) => openQuotes[row.id]);
        return (
          <section key={shop.dealId} className="ff-card overflow-hidden" data-testid={`quote-shop-${shop.dealId}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ExpandCollapseControl
                    expanded={shopOpen}
                    onExpand={() => {
                      if (!shopOpen) toggleShop(shop.dealId);
                    }}
                    onCollapse={() => {
                      if (shopOpen) toggleShop(shop.dealId);
                    }}
                    expandLabel={`Expand ${shop.dealTitle}`}
                    collapseLabel={`Collapse ${shop.dealTitle}`}
                    testId={`quote-shop-expand-${shop.dealId}`}
                  />
                  <Link
                    href={`/deals/${shop.dealId}?tab=quotes`}
                    className="text-base font-semibold text-navy hover:underline"
                  >
                    {shop.dealTitle}
                  </Link>
                  <StagePill stage={shop.dealStage} />
                  <span className="text-xs text-muted-foreground">{shop.line}</span>
                </div>
                <div className="mt-1">
                  <ShopSummary shop={shop} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link href={`/deals/${shop.dealId}?tab=quotes`} className="text-primary hover:underline">
                  Open deal
                </Link>
                <Link href={`/quotes?deal=${shop.dealId}`} className="text-primary hover:underline">
                  This shop only
                </Link>
                <Link href={compareHref(shop.dealId, shop.rows.map(quoteCompareId))} className="text-primary hover:underline">
                  Compare shop
                </Link>
              </div>
            </div>

            {shopOpen ? (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/50 px-4 py-2">
                  <button
                    type="button"
                    className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                    onClick={() => selectShop(shop, shopSelected !== shop.rows.length)}
                  >
                    {shopSelected === shop.rows.length ? "Unselect Quote" : "Select Quote"}
                  </button>
                  <ExpandCollapseControl
                    expanded={shopQuotesExpanded}
                    onExpand={() => setShopQuotes(shop, true)}
                    onCollapse={() => setShopQuotes(shop, false)}
                    expandLabel={`Expand quotes in ${shop.dealTitle}`}
                    collapseLabel={`Collapse quotes in ${shop.dealTitle}`}
                    testId={`quote-shop-quotes-expand-${shop.dealId}`}
                  />
                  {shopSelected > 0 ? (
                    <Link
                      href={compareHref(shop.dealId, shop.rows.filter((row) => selected.includes(row.id)).map(quoteCompareId))}
                      className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                    >
                      Compare {shopSelected} in this shop
                    </Link>
                  ) : null}
                </div>
                {shop.rows.length === 0 ? (
                  <p className="px-4 py-6 text-base text-muted-foreground">
                    No shops recorded on this deal. Filter markets first, then log the attempt. This
                    board does not call a rater.
                  </p>
                ) : (
                  shop.rows.map((row: TrackingRow) => (
                    <QuoteCard
                      key={row.id}
                      row={row}
                      open={openQuotes[row.id] ?? false}
                      selected={selected.includes(row.id)}
                      onToggleOpen={() => toggleQuote(row.id)}
                      onToggleSelect={() => toggleSelect(row.id)}
                    />
                  ))
                )}
              </>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Shop collapsed. Identity stays above — expand to see every quote card and its Actions menu.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
