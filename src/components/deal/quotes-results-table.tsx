"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { deleteSelectedQuotesAction } from "@/app/actions/quotes";
import { QuoteConfirmRow } from "@/components/deal/quote-confirm-row";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import {
  isLowConfidencePull,
  quotePullNeedsConfirm,
  type QuoteConfirmKind,
} from "@/lib/deals/quote-confirm";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import type { Carrier, Quote } from "@/lib/db/schema";
import {
  groupQuotesByRiskOutcome,
  riskOutcomeLabel,
} from "@/lib/quotes/outcomes";
import { asList } from "@/lib/safe-list";

type Row = { quote: Quote; carrier: Carrier; premium: Quote["premium"] };

export function QuotesResultsTable({
  dealId,
  rows,
  formId,
  confirmLogs,
  resultByCarrier,
}: {
  dealId: string;
  rows: Row[];
  formId: string;
  confirmLogs: { carrierId: string; why?: string | null }[];
  resultByCarrier: Record<string, string | undefined>;
}) {
  const list = asList(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const ids = useMemo(() => list.map((row) => row.quote.id), [list]);
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));
  const groups = useMemo(
    () => groupQuotesByRiskOutcome(list, (row) => row.quote.riskOutcome),
    [list],
  );

  function toggle(id: string, on: boolean) {
    setSelected((current) => (on ? [...new Set([...current, id])] : current.filter((x) => x !== id)));
  }

  function toggleAll(on: boolean) {
    setSelected(on ? [...ids] : []);
  }

  function onDelete() {
    if (selected.length === 0) return;
    const subject =
      selected.length === 1 ? "this quote" : `these ${selected.length} quotes`;
    if (!confirmHardDelete(subject)) return;
    const data = new FormData();
    data.set("dealId", dealId);
    for (const id of selected) data.append("quoteId", id);
    startTransition(async () => {
      await deleteSelectedQuotesAction(data);
    });
  }

  function statusLabel(quote: Quote, carrierId: string) {
    const denied = resultByCarrier[carrierId] === "declined";
    if (denied) return "Denied";
    if (quote.riskOutcome) return riskOutcomeLabel(quote.riskOutcome);
    if (quote.bindable) return "Accepted";
    return "Maybe";
  }

  return (
    <div className="space-y-2" data-ff-quotes-select data-ff-quotes-by-outcome="">
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selected.length === 0 || pending}
          onClick={onDelete}
          data-ff-quotes-delete-selected=""
        >
          {pending ? "Deleting…" : `Delete selected${selected.length ? ` (${selected.length})` : ""}`}
        </Button>
      </div>
      <table className="ff-table">
        <thead>
          <tr>
            <th>Carrier</th>
            <th>Premium</th>
            <th>Coverages</th>
            <th>Deductibles</th>
            <th>Status</th>
            <th className="w-12 text-center">
              <input
                type="checkbox"
                aria-label="Select all quotes"
                checked={allOn}
                onChange={(event) => toggleAll(event.target.checked)}
                data-ff-quotes-select-all=""
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.outcome}>
              <tr
                data-ff-quote-outcome-group={group.outcome}
                className="bg-muted/60"
              >
                <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-navy">
                  {group.label}
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({group.rows.length})
                  </span>
                </td>
              </tr>
              {group.rows.map(({ quote, carrier }) => {
                const denied = resultByCarrier[carrier.id] === "declined";
                const kind: QuoteConfirmKind = quotePullNeedsConfirm({
                  quoteId: quote.id,
                  carrierId: carrier.id,
                  formId,
                  logs: confirmLogs,
                  denied,
                  lowConfidence: isLowConfidencePull(quote),
                });
                const on = selected.includes(quote.id);
                return (
                  <tr
                    key={quote.id}
                    data-ff-quote-row={quote.id}
                    data-ff-quote-outcome={quote.riskOutcome ?? "maybe"}
                  >
                    <td className="font-medium">
                      {carrier.name}
                      <QuoteConfirmRow
                        dealId={dealId}
                        quoteId={quote.id}
                        carrierId={carrier.id}
                        carrierName={carrier.name}
                        formId={formId}
                        kind={kind}
                      />
                    </td>
                    <td>{formatMoney(quote.premium)}</td>
                    <td className="text-xs">
                      Cov A {formatMoney(quote.coverageA)}
                      {quote.coverageGaps.length ? (
                        <div className="text-fit-flag">{quote.coverageGaps.join("; ")}</div>
                      ) : (
                        <div className="text-muted-foreground">Gaps none noted</div>
                      )}
                    </td>
                    <td className="text-xs">
                      AOP {quote.aopDeductible ?? "—"}
                      <div>Hurricane {quote.hurricaneDeductible ?? "—"}</div>
                    </td>
                    <td className="text-xs">{statusLabel(quote, carrier.id)}</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select ${carrier.name}`}
                        checked={on}
                        onChange={(event) => toggle(quote.id, event.target.checked)}
                        data-ff-quote-select={quote.id}
                      />
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
