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
  nextStepLabel,
  normalizeRiskOutcome,
  parseCovATriedForced,
  riskOutcomeLabel,
  riskOutcomePillClass,
  shortRiskChips,
  type RiskOutcome,
} from "@/lib/quotes/outcomes";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";

type Row = { quote: Quote; carrier: Carrier; premium: Quote["premium"] };

function portalWhy(notes: string | null | undefined, logWhy?: string | null): string {
  const fromLog = (logWhy ?? "").trim();
  if (fromLog) return fromLog;
  const raw = (notes ?? "").trim();
  if (!raw) return "—";
  // First clause only — keep details short.
  const first = raw.split(/\s*[·|]\s*|\n/)[0]?.trim() || raw;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

function carrierOpenHref(quote: Quote, carrier: Carrier): string | null {
  const raw =
    quote.carrierOpenUrl?.trim() ||
    carrier.agentPortalUrl?.trim() ||
    carrier.portalUrl?.trim() ||
    "";
  return raw || null;
}

function CovASecondary({ quote }: { quote: Quote }) {
  const { tried, forced, forcedNoted } = parseCovATriedForced({
    coverageA: quote.coverageA,
    notes: quote.notes,
  });
  if (tried != null && forced != null) {
    return (
      <span className="text-xs text-muted-foreground">
        Cov A tried {formatMoney(tried)} · forced {formatMoney(forced)}
      </span>
    );
  }
  if (forced != null) {
    return (
      <span className="text-xs text-muted-foreground">
        Cov A {formatMoney(forced)}
        {forcedNoted ? " · forced" : ""}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Cov A —</span>;
}

export function QuotesResultsTable({
  dealId,
  rows,
  formId,
  confirmLogs,
  resultByCarrier,
  whyByCarrier = {},
}: {
  dealId: string;
  rows: Row[];
  formId: string;
  confirmLogs: { carrierId: string; why?: string | null }[];
  resultByCarrier: Record<string, string | undefined>;
  whyByCarrier?: Record<string, string | undefined>;
}) {
  const list = asList(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  function toggleDetails(id: string) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
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

  function outcomeFor(quote: Quote, carrierId: string): RiskOutcome {
    if (resultByCarrier[carrierId] === "declined") return "declined";
    return normalizeRiskOutcome(quote.riskOutcome) ?? (quote.bindable ? "bindable" : "conditional");
  }

  return (
    <div className="space-y-3" data-ff-quotes-select data-ff-quotes-by-outcome="">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            aria-label="Select all quotes"
            checked={allOn}
            onChange={(event) => toggleAll(event.target.checked)}
            data-ff-quotes-select-all=""
          />
          Select all
        </label>
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

      <div className="space-y-4 px-3 pb-3">
        {groups.map((group) => (
          <section
            key={group.outcome}
            data-ff-quote-outcome-group={group.outcome}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 px-1">
              <h4 className="text-sm font-semibold text-navy">{group.label}</h4>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                {group.rows.length}
              </span>
            </div>

            <div className="space-y-2">
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
                const outcome = outcomeFor(quote, carrier.id);
                const canBind = outcome === "bindable" || quote.nextStep === "can_bind" || quote.bindable;
                const openHref = carrierOpenHref(quote, carrier);
                const detailsOpen = Boolean(expanded[quote.id]);
                const chips = shortRiskChips(quote.notes, quote.coverageGaps ?? []);

                return (
                  <Fragment key={quote.id}>
                    <article
                      data-ff-quote-row={quote.id}
                      data-ff-quote-outcome={outcome}
                      className={cn(
                        "rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
                        on && "ring-1 ring-primary/30",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-3 px-3 py-3 sm:flex-nowrap">
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            aria-label={`Select ${carrier.name}`}
                            checked={on}
                            onChange={(event) => toggle(quote.id, event.target.checked)}
                            data-ff-quote-select={quote.id}
                          />
                        </div>

                        <div className="min-w-[10rem] flex-1 space-y-0.5">
                          <div className="text-sm font-semibold text-navy">{carrier.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-navy/80">{formId}</span>
                            <span className="mx-1.5 text-border">·</span>
                            <span>{quote.quoteNumber?.trim() || "No quote #"}</span>
                          </div>
                          <QuoteConfirmRow
                            dealId={dealId}
                            quoteId={quote.id}
                            carrierId={carrier.id}
                            carrierName={carrier.name}
                            formId={formId}
                            kind={kind}
                          />
                        </div>

                        <div className="min-w-[8.5rem] flex-1 space-y-0.5 sm:text-center">
                          <div className="text-base font-semibold tabular-nums text-navy">
                            {formatMoney(quote.premium)}
                          </div>
                          <CovASecondary quote={quote} />
                        </div>

                        <div className="flex min-w-[7.5rem] justify-start sm:justify-end">
                          <span
                            data-ff-quote-status-pill={outcome}
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                              riskOutcomePillClass(outcome),
                            )}
                          >
                            {riskOutcomeLabel(outcome)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/30 px-3 py-2">
                        <Button
                          type="button"
                          size="xs"
                          disabled={!canBind}
                          data-ff-quote-bind={quote.id}
                          title={canBind ? "Bind (wire later)" : "Bind only when Bindable"}
                        >
                          Bind
                        </Button>
                        {openHref ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            data-ff-quote-open-carrier={quote.id}
                            onClick={() => window.open(openHref, "_blank", "noopener,noreferrer")}
                          >
                            Open in carrier
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            data-ff-quote-open-carrier={quote.id}
                            title="Portal URL / deep-link placeholder until APIs exist"
                            onClick={() => undefined}
                          >
                            Open in carrier
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          data-ff-quote-details={quote.id}
                          aria-expanded={detailsOpen}
                          onClick={() => toggleDetails(quote.id)}
                        >
                          {detailsOpen ? "Hide details" : "Details"}
                        </Button>
                      </div>

                      {detailsOpen ? (
                        <div
                          data-ff-quote-details-panel={quote.id}
                          className="space-y-2 border-t border-border/70 px-3 py-3 text-xs"
                        >
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Portal why
                              </div>
                              <p className="mt-0.5 text-sm text-navy">
                                {portalWhy(quote.notes, whyByCarrier[carrier.id])}
                              </p>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Next step
                              </div>
                              <p className="mt-0.5 text-sm text-navy">{nextStepLabel(quote.nextStep)}</p>
                            </div>
                          </div>
                          {chips.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {chips.map((chip) => (
                                <span
                                  key={chip}
                                  className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-navy shadow-sm"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {quote.notes ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Appetite notes
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                                {quote.notes}
                              </p>
                            </div>
                          ) : null}
                          {(quote.aopDeductible || quote.hurricaneDeductible) && (
                            <p className="text-muted-foreground">
                              AOP {quote.aopDeductible ?? "—"} · Hurricane{" "}
                              {quote.hurricaneDeductible ?? "—"}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </article>
                  </Fragment>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
