"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  addQuoteNoteAction,
  deleteSelectedQuotesAction,
  saveQuoteAgentRatingAction,
  saveQuoteAgentStatusAction,
} from "@/app/actions/quotes";
import { QuoteConfirmRow } from "@/components/deal/quote-confirm-row";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import {
  isLowConfidencePull,
  quotePullNeedsConfirm,
  type QuoteConfirmKind,
} from "@/lib/deals/quote-confirm";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import type { Carrier, Quote, QuoteNote } from "@/lib/db/schema";
import {
  AGENT_STATUS_LABELS,
  AGENT_STATUSES,
  bindRequirementChips,
  groupQuotesBySection,
  normalizeAgentStatus,
  normalizeRiskOutcome,
  REASON_FOR_NO,
  REASON_FOR_NO_LABELS,
  riskOutcomeLabel,
  riskOutcomePillClass,
  shortReasonLabel,
  type AgentStatus,
  type ReasonForNo,
  type RiskOutcome,
} from "@/lib/quotes/outcomes";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Star } from "lucide-react";

type Row = { quote: Quote; carrier: Carrier; premium: Quote["premium"] };

function carrierOpenHref(quote: Quote, carrier: Carrier): string | null {
  const raw =
    quote.carrierOpenUrl?.trim() ||
    carrier.agentPortalUrl?.trim() ||
    carrier.portalUrl?.trim() ||
    "";
  return raw || null;
}

function formatNoteWhen(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StarRating({
  dealId,
  quoteId,
  value,
  disabled,
}: {
  dealId: string;
  quoteId: string;
  value: number | null | undefined;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const current = value != null && value >= 1 && value <= 5 ? value : 0;

  function setRating(next: number) {
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quoteId);
    data.set("rating", String(next === current ? 0 : next));
    startTransition(async () => {
      await saveQuoteAgentRatingAction(data);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      data-ff-quote-rating={quoteId}
      title="Star rating (favorites float up)"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= current;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled || pending}
            aria-label={`Rate ${n} of 5`}
            data-ff-quote-star={n}
            onClick={() => setRating(n)}
            className={cn(
              "rounded p-0.5 transition-colors",
              on ? "text-fit-flag" : "text-muted-foreground/40 hover:text-fit-flag/70",
            )}
          >
            <Star className={cn("size-3.5", on && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}

export function QuotesResultsTable({
  dealId,
  rows,
  formId,
  confirmLogs,
  resultByCarrier,
  notesByQuote = {},
}: {
  dealId: string;
  rows: Row[];
  formId: string;
  confirmLogs: { carrierId: string; why?: string | null }[];
  resultByCarrier: Record<string, string | undefined>;
  notesByQuote?: Record<string, QuoteNote[]>;
}) {
  const list = asList(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [recheck, setRecheck] = useState(false);
  const [pendingDead, setPendingDead] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const ids = useMemo(() => list.map((row) => row.quote.id), [list]);
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));
  const sections = useMemo(
    () => groupQuotesBySection(list, (row) => row.quote.riskOutcome),
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

  function onStatusChange(quoteId: string, next: AgentStatus, reasonForNo?: ReasonForNo) {
    if (next === "dead" && !reasonForNo) {
      setPendingDead((current) => ({ ...current, [quoteId]: true }));
      setExpanded((current) => ({ ...current, [quoteId]: true }));
      return;
    }
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quoteId);
    data.set("agentStatus", next);
    if (reasonForNo) data.set("reasonForNo", reasonForNo);
    startTransition(async () => {
      await saveQuoteAgentStatusAction(data);
      setPendingDead((current) => {
        const copy = { ...current };
        delete copy[quoteId];
        return copy;
      });
    });
  }

  function onAddNote(quoteId: string, form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("dealId", dealId);
    data.set("quoteId", quoteId);
    startTransition(async () => {
      await addQuoteNoteAction(data);
      form.reset();
    });
  }

  return (
    <div className="space-y-3" data-ff-quotes-select data-ff-quotes-by-outcome="">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-4">
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
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={recheck}
              onChange={(event) => setRecheck(event.target.checked)}
              data-ff-quotes-recheck=""
              aria-label="Recheck this quote"
            />
            Recheck this quote
          </label>
        </div>
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
        {sections.map((section) => {
          const collapsed = section.collapseByDefault && !declinedOpen;
          return (
            <section
              key={section.key}
              data-ff-quote-outcome-group={section.key}
              className="space-y-2"
            >
              {section.collapseByDefault ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-muted/40"
                  data-ff-quotes-declined-toggle=""
                  aria-expanded={!collapsed}
                  onClick={() => setDeclinedOpen((v) => !v)}
                >
                  {collapsed ? (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                  <h4 className="text-sm font-semibold text-navy">
                    {collapsed
                      ? `Show declined / no market (${section.rows.length})`
                      : section.label}
                  </h4>
                  {!collapsed ? (
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      {section.rows.length}
                    </span>
                  ) : null}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <h4 className="text-sm font-semibold text-navy">{section.label}</h4>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {section.rows.length}
                  </span>
                </div>
              )}

              {collapsed ? null : (
                <div className="space-y-2">
                  {section.rows.map(({ quote, carrier }) => {
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
                    const canBind =
                      outcome === "bindable" || quote.nextStep === "can_bind" || quote.bindable;
                    const openHref = carrierOpenHref(quote, carrier);
                    const detailsOpen = Boolean(expanded[quote.id]);
                    const reason = shortReasonLabel({
                      notes: quote.notes,
                      riskOutcome: outcome,
                      gaps: quote.coverageGaps ?? [],
                    });
                    const reqChips = bindRequirementChips({
                      notes: quote.notes,
                      gaps: quote.coverageGaps,
                      bindRequirements: quote.bindRequirements,
                      coverageA: quote.coverageA,
                      hurricaneDeductible: quote.hurricaneDeductible,
                    });
                    const agentStatus = normalizeAgentStatus(quote.agentStatus);
                    const thread = notesByQuote[quote.id] ?? [];
                    const needsReason = pendingDead[quote.id] || agentStatus === "dead";

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
                          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap">
                            <input
                              type="checkbox"
                              aria-label={`Select ${carrier.name}`}
                              checked={on}
                              onChange={(event) => toggle(quote.id, event.target.checked)}
                              data-ff-quote-select={quote.id}
                              className="shrink-0"
                            />

                            <span
                              data-ff-quote-status-pill={outcome}
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                                riskOutcomePillClass(outcome),
                              )}
                            >
                              {riskOutcomeLabel(outcome)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="truncate text-sm font-semibold text-navy">
                                  {carrier.name}
                                </span>
                                <span
                                  className="truncate text-xs text-muted-foreground"
                                  data-ff-quote-reason={quote.id}
                                >
                                  {reason}
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-navy">
                                  {formatMoney(quote.premium)}
                                </span>
                              </div>
                              {recheck && kind !== "skip" && kind !== "admin" ? (
                                <QuoteConfirmRow
                                  dealId={dealId}
                                  quoteId={quote.id}
                                  carrierId={carrier.id}
                                  carrierName={carrier.name}
                                  formId={formId}
                                  kind={kind}
                                />
                              ) : null}
                            </div>

                            <StarRating
                              dealId={dealId}
                              quoteId={quote.id}
                              value={quote.agentRating}
                              disabled={pending}
                            />

                            <select
                              className="h-7 max-w-[9.5rem] rounded-md border border-border bg-background px-1.5 text-[11px] text-navy"
                              value={agentStatus}
                              disabled={pending}
                              data-ff-quote-agent-status={quote.id}
                              aria-label="Quote status"
                              onChange={(event) =>
                                onStatusChange(quote.id, event.target.value as AgentStatus)
                              }
                            >
                              {AGENT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {AGENT_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>

                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
                                  onClick={() =>
                                    window.open(openHref, "_blank", "noopener,noreferrer")
                                  }
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
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                disabled
                                title="Available when carrier PDF API is connected"
                                data-ff-quote-download={quote.id}
                              >
                                Download quote file
                              </Button>
                            </div>
                          </div>

                          {detailsOpen ? (
                            <div
                              data-ff-quote-details-panel={quote.id}
                              className="space-y-3 border-t border-border/70 px-3 py-3 text-xs"
                            >
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Bind requirements
                                </div>
                                {reqChips.length ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {reqChips.map((chip) => (
                                      <span
                                        key={chip}
                                        className="inline-flex items-center rounded-full border border-fit-green/30 bg-fit-green-bg px-2.5 py-0.5 text-[11px] font-medium text-navy shadow-sm"
                                        data-ff-bind-req-chip=""
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    No bind requirements called out.
                                  </p>
                                )}
                              </div>

                              {needsReason ? (
                                <div data-ff-quote-reason-for-no={quote.id}>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Reason for no
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {REASON_FOR_NO.map((code) => (
                                      <button
                                        key={code}
                                        type="button"
                                        disabled={pending}
                                        data-ff-reason-for-no={code}
                                        className={cn(
                                          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-sm transition-colors",
                                          quote.reasonForNo === code
                                            ? "border-fit-red/45 bg-fit-red-bg text-fit-red"
                                            : "border-border bg-card text-navy hover:bg-muted",
                                        )}
                                        onClick={() => onStatusChange(quote.id, "dead", code)}
                                      >
                                        {REASON_FOR_NO_LABELS[code]}
                                      </button>
                                    ))}
                                  </div>
                                  {pendingDead[quote.id] && !quote.reasonForNo ? (
                                    <p className="mt-1 text-[11px] text-fit-flag">
                                      Pick a reason to mark this quote dead.
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}

                              <div data-ff-quote-notes={quote.id}>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Notes
                                </div>
                                <ul className="mt-1.5 space-y-1.5">
                                  {thread.length === 0 ? (
                                    <li className="text-sm text-muted-foreground">No notes yet.</li>
                                  ) : (
                                    thread.map((note) => (
                                      <li
                                        key={note.id}
                                        className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5"
                                        data-ff-quote-note={note.id}
                                      >
                                        <div className="text-[10px] text-muted-foreground">
                                          {formatNoteWhen(note.createdAt)}
                                          {note.createdBy ? ` · ${note.createdBy}` : ""}
                                        </div>
                                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-navy">
                                          {note.body}
                                        </p>
                                      </li>
                                    ))
                                  )}
                                </ul>
                                <form
                                  className="mt-2 flex flex-wrap items-end gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    onAddNote(quote.id, event.currentTarget);
                                  }}
                                >
                                  <label className="min-w-[12rem] flex-1">
                                    <span className="sr-only">Add note</span>
                                    <input
                                      name="body"
                                      required
                                      maxLength={4000}
                                      placeholder="Add a note…"
                                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                                      data-ff-quote-note-input={quote.id}
                                    />
                                  </label>
                                  <Button type="submit" size="xs" disabled={pending}>
                                    Add note
                                  </Button>
                                </form>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
