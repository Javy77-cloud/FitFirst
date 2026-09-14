"use client";

import { formatMoney } from "@/lib/domain";
import { fileViewHref } from "@/lib/files/urls";
import type { QuoteFileRow } from "@/components/deal/quote-file-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QUOTE_COMPARE_MAX } from "@/lib/quotes/compare-selection";

export type QuoteCompareColumn = {
  quoteId: string;
  carrierName: string;
  premium: string | number | null | undefined;
  quoteNumber?: string | null;
  coverageA?: number | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  notes?: string | null;
  carrierFiles: QuoteFileRow[];
};

/**
 * Side-by-side compare for Bindable / Conditional quotes.
 * Prefer the carrier bot file (eye / download list); fall back to quick-view fields.
 * Columns arrive already sorted cheapest → most expensive.
 */
export function QuoteCompareDialog({
  open,
  onOpenChange,
  columns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: QuoteCompareColumn[];
}) {
  const count = columns.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[min(96vw,1200px)] max-w-[1200px] flex-col gap-3 overflow-hidden sm:max-w-[1200px]"
        data-ff-quote-compare-dialog=""
      >
        <DialogHeader>
          <DialogTitle className="text-navy">Compare Quotes</DialogTitle>
          <DialogDescription>
            {count === 0
              ? `Pick up to ${QUOTE_COMPARE_MAX} Bindable or Conditional quotes.`
              : `${count} quote${count === 1 ? "" : "s"} · cheapest on the left`}
          </DialogDescription>
        </DialogHeader>

        {count === 0 ? (
          <p className="text-sm text-muted-foreground" data-ff-quote-compare-empty="">
            Check quotes in Bindable or Conditional, then hit Compare again.
          </p>
        ) : (
          <div
            className="grid min-h-0 flex-1 gap-3 overflow-auto"
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
            data-ff-quote-compare-grid=""
          >
            {columns.map((col) => {
              const file = col.carrierFiles[0] ?? null;
              return (
                <section
                  key={col.quoteId}
                  className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card"
                  data-ff-quote-compare-col={col.quoteId}
                >
                  <header className="shrink-0 border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-semibold text-navy">{col.carrierName}</p>
                    <p className="text-sm font-semibold tabular-nums text-navy">
                      {formatMoney(col.premium)}
                    </p>
                    {col.quoteNumber ? (
                      <p className="truncate text-[11px] text-muted-foreground">#{col.quoteNumber}</p>
                    ) : null}
                  </header>
                  <div className="min-h-0 flex-1 bg-muted/20">
                    {file ? (
                      <iframe
                        title={`${col.carrierName} quote file`}
                        src={fileViewHref(file.id)}
                        className="h-full min-h-[360px] w-full border-0 bg-white"
                        data-ff-quote-compare-file={file.id}
                      />
                    ) : (
                      <dl
                        className="grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1.5 p-3 text-xs"
                        data-ff-quote-compare-quick=""
                      >
                        <dt className="text-muted-foreground">Cov A</dt>
                        <dd className="text-navy">{formatMoney(col.coverageA)}</dd>
                        <dt className="text-muted-foreground">AOP</dt>
                        <dd className="text-navy">{col.aopDeductible?.trim() || "—"}</dd>
                        <dt className="text-muted-foreground">Hurricane</dt>
                        <dd className="text-navy">{col.hurricaneDeductible?.trim() || "—"}</dd>
                        <dt className="text-muted-foreground">Notes</dt>
                        <dd className="whitespace-pre-wrap text-navy">
                          {(col.notes ?? "").trim()
                            ? (col.notes!.trim().length > 320
                                ? `${col.notes!.trim().slice(0, 320)}…`
                                : col.notes!.trim())
                            : "—"}
                        </dd>
                        <dt className="col-span-2 pt-2 text-[11px] text-muted-foreground">
                          No carrier file yet — showing quick quote fields. Bot snapshots land here when
                          available.
                        </dt>
                      </dl>
                    )}
                  </div>
                  {file ? (
                    <p className="shrink-0 truncate border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                      {file.displayName || file.filename}
                    </p>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
