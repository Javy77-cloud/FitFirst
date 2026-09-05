"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { runDeskMacro } from "@/app/actions/developer-hub";
import { QuoteCard } from "@/components/quotes/quote-card";
import { ShopSummary } from "@/components/quotes/tracking-table";
import { StagePill } from "@/components/fit-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { compareHref, quoteCompareId, selectedSameDeal } from "@/lib/quotes/board";
import { quoteCardDefaultOpen, shopSectionOpen } from "@/lib/quotes/collapse";
import type { TrackingRow, TrackingShop } from "@/lib/quotes/tracking";
import { cn } from "@/lib/utils";

export function QuoteBoard({
  shops,
  focusedDeal = false,
  macros = [],
}: {
  shops: TrackingShop[];
  focusedDeal?: boolean;
  macros?: Array<{ id: string; name: string }>;
}) {
  const allRows = useMemo(() => shops.flatMap((shop) => shop.rows), [shops]);
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
          <button type="button" className={cn(buttonVariants({ size: "xs", variant: "outline" }))} onClick={() => expandAll(true)}>
            Expand all
          </button>
          <button type="button" className={cn(buttonVariants({ size: "xs", variant: "outline" }))} onClick={() => expandAll(false)}>
            Collapse all
          </button>
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
              ? "Tick quotes to compare or run a Settings macro. Actions stay on every card — nothing is hidden in a menu."
              : compareDealId
                ? `${selectedRows.length} selected on one shop.`
                : `${selectedRows.length} selected across shops — pick one deal to compare.`}
          </span>
        </div>
        {macroMessage ? <p className="mt-2 text-sm text-navy">{macroMessage}</p> : null}
      </section>

      {shops.map((shop) => {
        const shopOpen = openShops[shop.dealId] ?? true;
        const shopSelected = shop.rows.filter((row) => selected.includes(row.id)).length;
        return (
          <section key={shop.dealId} className="ff-card overflow-hidden" data-testid={`quote-shop-${shop.dealId}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleShop(shop.dealId)}
                    aria-expanded={shopOpen}
                    className={cn(buttonVariants({ size: "xs", variant: "secondary" }))}
                  >
                    {shopOpen ? "Collapse shop" : "Expand shop"}
                  </button>
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
                    {shopSelected === shop.rows.length ? "Unselect shop" : "Select shop"}
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                    onClick={() => setShopQuotes(shop, true)}
                  >
                    Expand quotes
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                    onClick={() => setShopQuotes(shop, false)}
                  >
                    Collapse quotes
                  </button>
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
                Shop collapsed. Identity stays above — expand to see every quote card and its actions.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
