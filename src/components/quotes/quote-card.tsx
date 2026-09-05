"use client";

import { TrackingStatusBadge } from "@/components/quotes/status-badge";
import { ExpandCollapseControl } from "@/components/quotes/expand-collapse";
import { QuoteActionsMenu, QuoteLostReason } from "@/components/quotes/quote-actions";
import { formatMoney } from "@/lib/domain";
import { quoteIdentity } from "@/lib/quotes/board";
import type { TrackingRow } from "@/lib/quotes/tracking";
import { cn } from "@/lib/utils";

export function QuoteCard({
  row,
  open,
  selected,
  onToggleOpen,
  onToggleSelect,
}: {
  row: TrackingRow;
  open: boolean;
  selected: boolean;
  onToggleOpen: () => void;
  onToggleSelect: () => void;
}) {
  const identity = quoteIdentity(row);
  const detailsId = `quote-detail-${row.id}`;

  return (
    <article
      className={cn(
        "border-b border-border last:border-b-0",
        selected && "bg-fit-check-bg/30",
      )}
      data-testid={`quote-card-${row.id}`}
      data-open={open ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <label className="mt-1 flex items-center gap-2 text-xs text-navy">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${identity.carrier} ${identity.quoteNumber}`}
          />
          <span className="sr-only sm:not-sr-only">Select</span>
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <ExpandCollapseControl
                expanded={open}
                onExpand={() => {
                  if (!open) onToggleOpen();
                }}
                onCollapse={() => {
                  if (open) onToggleOpen();
                }}
                expandLabel={`Expand ${identity.carrier} quote`}
                collapseLabel={`Collapse ${identity.carrier} quote`}
                testId={`quote-expand-${row.id}`}
              />
              <h3 className="text-base font-semibold text-navy">{identity.carrier}</h3>
              <TrackingStatusBadge status={identity.status} />
              <span className="text-sm font-medium text-navy">{identity.premium}</span>
              <span className="font-mono text-xs text-muted-foreground">#{identity.quoteNumber}</span>
              {row.cheapestQuotedRank != null ? (
                <span className={cn("text-xs", row.cheapestQuotedRank === 1 && "font-semibold text-navy")}>
                  #{row.cheapestQuotedRank}
                  {row.cheapestQuotedRank === 1 ? " cheapest" : ""}
                </span>
              ) : null}
              {!row.bindable && row.status === "quoted" ? (
                <span className="text-xs text-fit-flag">Quoted · not bindable</span>
              ) : null}
            </div>
            <QuoteActionsMenu row={row} />
          </div>
          <div className="mt-2">
            <QuoteLostReason row={row} />
          </div>
        </div>
      </div>

      {open ? (
        <div id={detailsId} className="border-t border-border bg-secondary/40 px-4 py-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Line" value={row.line} />
            <Detail
              label="Date"
              value={
                row.attemptedAt instanceof Date
                  ? row.attemptedAt.toISOString().slice(0, 10)
                  : String(row.attemptedAt).slice(0, 10)
              }
            />
            <Detail label="Bindable" value={row.bindable ? "Yes" : "No"} />
            <Detail label="Coverage A" value={formatMoney(row.coverageA)} />
            <Detail label="AOP deductible" value={row.aopDeductible ?? "—"} />
            <Detail label="Hurricane deductible" value={row.hurricaneDeductible ?? "—"} />
            <Detail
              label="Why / notes"
              value={row.why || row.notes || "No note on this attempt."}
              wide
            />
            <Detail
              label="Coverage gaps"
              value={row.coverageGaps.length ? row.coverageGaps.join("; ") : "None noted"}
              wide
            />
          </dl>
        </div>
      ) : null}
    </article>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-navy">{value}</dd>
    </div>
  );
}
