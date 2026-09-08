"use client";

import { useMemo, useState, useTransition } from "react";
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

  return (
    <div className="space-y-2" data-ff-quotes-select>
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
          {list.map(({ quote, carrier }) => {
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
              <tr key={quote.id} data-ff-quote-row={quote.id}>
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
                <td className="text-xs uppercase">
                  {denied ? "Denied" : quote.bindable ? "Quoted" : "Not bindable"}
                </td>
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
        </tbody>
      </table>
    </div>
  );
}
