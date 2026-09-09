"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  addQuoteNoteAction,
  recheckQuotesAction,
  saveQuoteAgentRatingAction,
  saveQuoteAgentStatusAction,
} from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BIND_GATE_COPY } from "@/lib/deals/bind-gate";
import { formatMoney } from "@/lib/domain";
import type { Carrier, Quote, QuoteNote } from "@/lib/db/schema";
import {
  AGENT_STATUS_LABELS,
  AGENT_STATUSES,
  bindRequirementChips,
  quoteNeedsBindRecheckAlert,
  groupQuotesBySection,
  normalizeAgentStatus,
  normalizeRiskOutcome,
  REASON_FOR_NO,
  REASON_FOR_NO_LABELS,
  riskOutcomeLabel,
  riskOutcomePillClass,
  type AgentStatus,
  type ReasonForNo,
  type RiskOutcome,
} from "@/lib/quotes/outcomes";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronRight, EyeOff, RefreshCw, Star } from "lucide-react";

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

function premiumNumber(value: Quote["premium"]): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
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

function RecheckMarkIcon({
  lit,
  className,
}: {
  lit: boolean;
  className?: string;
}) {
  return (
    <RefreshCw
      className={cn(
        "size-3.5 transition-colors",
        lit ? "text-primary" : "text-muted-foreground/40",
        className,
      )}
      strokeWidth={lit ? 2.5 : 2}
    />
  );
}

function BindRecheckAlertDialog({
  open,
  onOpenChange,
  carrierName,
  quote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierName: string;
  quote: Quote | null;
}) {
  const [checks, setChecks] = useState({ premium: false, coverages: false, deductibles: false });
  const checklistKey = `${quote?.id ?? "none"}:${open ? "open" : "closed"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setChecks({ premium: false, coverages: false, deductibles: false });
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        data-ff-quote-bind-alert-dialog={quote?.id ?? ""}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-fit-flag/20 text-fit-flag">
              <AlertTriangle className="size-5" />
            </span>
            {BIND_GATE_COPY.title}
          </DialogTitle>
          <p
            className="text-sm leading-snug text-muted-foreground"
            data-ff-quote-bind-alert-subtitle=""
          >
            {BIND_GATE_COPY.subtitle}
          </p>
          <DialogDescription>
            {quote ? (
              <>
                {carrierName} · {formatMoney(quote.premium)} · Cov A {formatMoney(quote.coverageA)} ·
                AOP {quote.aopDeductible ?? "—"} · Hurricane {quote.hurricaneDeductible ?? "—"}
              </>
            ) : (
              "Confirm premium, coverages, and deductibles before bind."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2" data-ff-quote-bind-alert-checklist="" key={checklistKey}>
          {(
            [
              ["premium", BIND_GATE_COPY.premium],
              ["coverages", BIND_GATE_COPY.coverages],
              ["deductibles", BIND_GATE_COPY.deductibles],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={checks[key]}
                onChange={(event) =>
                  setChecks((current) => ({ ...current, [key]: event.target.checked }))
                }
                className="mt-0.5 accent-[var(--fit-flag,#d97706)]"
                data-ff-quote-bind-alert-check={key}
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="text-xs text-fit-flag" data-ff-quote-bind-alert-blocked="">
            {BIND_GATE_COPY.blocked}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuotesResultsTable({
  dealId,
  rows,
  formId: _formId,
  confirmLogs: _confirmLogs,
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
  const [recheckMarked, setRecheckMarked] = useState<string[]>([]);
  const [hideMarked, setHideMarked] = useState<string[]>([]);
  const [hidesApplied, setHidesApplied] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [pendingDead, setPendingDead] = useState<Record<string, boolean>>({});
  const [alertQuoteId, setAlertQuoteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [premiumFloors, setPremiumFloors] = useState<Record<string, number>>({});

  const sections = useMemo(
    () => groupQuotesBySection(list, (row) => row.quote.riskOutcome),
    [list],
  );
  const recheckCount = recheckMarked.length;
  const anyRecheck = recheckCount > 0;

  const alertRow = useMemo(
    () => list.find((row) => row.quote.id === alertQuoteId) ?? null,
    [list, alertQuoteId],
  );

  // Session hide marks drop when premium improves vs the floor captured at mark time.
  const effectiveHideMarked = useMemo(() => {
    const kept: string[] = [];
    for (const id of hideMarked) {
      const floor = premiumFloors[id];
      if (floor != null) {
        const row = list.find((r) => r.quote.id === id);
        const current = row ? premiumNumber(row.quote.premium) : null;
        if (current != null && current < floor) continue;
      }
      kept.push(id);
    }
    return kept;
  }, [hideMarked, list, premiumFloors]);

  const hideCount = effectiveHideMarked.length;
  const anyHide = hideCount > 0;
  const hidesEffectivelyApplied = hidesApplied && hideCount > 0;

  function toggleRecheckMark(id: string) {
    setRecheckMarked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function toggleHideMark(id: string) {
    setHideMarked((current) => {
      if (current.includes(id)) {
        setPremiumFloors((floors) => {
          if (!(id in floors)) return floors;
          const next = { ...floors };
          delete next[id];
          return next;
        });
        return current.filter((x) => x !== id);
      }
      const row = list.find((r) => r.quote.id === id);
      const n = row ? premiumNumber(row.quote.premium) : null;
      if (n != null) {
        setPremiumFloors((floors) => ({ ...floors, [id]: n }));
      }
      return [...current, id];
    });
  }

  function toggleDetails(id: string, fallbackOpen: boolean) {
    setExpanded((current) => {
      const currentlyOpen = id in current ? current[id] : fallbackOpen;
      return { ...current, [id]: !currentlyOpen };
    });
  }

  function onRecheck() {
    if (recheckMarked.length === 0) return;
    const ids = [...recheckMarked];
    const data = new FormData();
    data.set("dealId", dealId);
    for (const id of ids) data.append("quoteId", id);
    startTransition(async () => {
      await recheckQuotesAction(data);
      setRecheckMarked([]);
      // Recheck clears hide marks for those quote ids (tip: recheck clears marks → unhide).
      setHideMarked((current) => current.filter((id) => !ids.includes(id)));
      setPremiumFloors((floors) => {
        const next = { ...floors };
        for (const id of ids) delete next[id];
        return next;
      });
    });
  }

  function onHideMarked() {
    if (effectiveHideMarked.length === 0) return;
    setHidesApplied(true);
  }

  function onShowHidden() {
    setHidesApplied(false);
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
    <div className="space-y-3" data-ff-quotes-recheck-desk="" data-ff-quotes-by-outcome="">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={anyRecheck ? "default" : "outline"}
            disabled={!anyRecheck || pending}
            onClick={onRecheck}
            data-ff-quotes-recheck=""
            data-ff-quotes-recheck-count={recheckCount}
            className={cn(
              "gap-1.5",
              anyRecheck && "border-primary bg-primary text-primary-foreground shadow-sm",
            )}
            title={
              anyRecheck
                ? `Re-run ${recheckCount} marked quote${recheckCount === 1 ? "" : "s"}`
                : "Mark quotes with the refresh icon to recheck"
            }
          >
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-md",
                anyRecheck ? "bg-primary-foreground/15" : "bg-muted/60",
              )}
              data-ff-quotes-recheck-icon={anyRecheck ? "lit" : "muted"}
              aria-hidden
            >
              <RecheckMarkIcon
                lit={anyRecheck}
                className={anyRecheck ? "text-primary-foreground" : undefined}
              />
            </span>
            {pending ? "Queuing…" : anyRecheck ? `Recheck (${recheckCount})` : "Recheck"}
          </Button>

          {hidesEffectivelyApplied ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onShowHidden}
              data-ff-quotes-show-hidden=""
              data-ff-quotes-hidden-count={hideCount}
              className="gap-1.5"
              title="Show hide-marked quotes again"
            >
              <EyeOff className="size-3.5 text-muted-foreground" />
              Show hidden ({hideCount})
            </Button>
          ) : anyHide ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onHideMarked}
              data-ff-quotes-hide-marked=""
              data-ff-quotes-hide-count={hideCount}
              className="gap-1.5 border-border text-navy hover:bg-muted/60"
              title={`Hide ${hideCount} marked quote${hideCount === 1 ? "" : "s"} (session only)`}
            >
              <EyeOff className="size-3.5 text-muted-foreground" />
              Hide marked ({hideCount})
            </Button>
          ) : null}
        </div>

        {anyRecheck ? (
          <p className="text-[11px] text-muted-foreground" data-ff-quotes-recheck-hint="">
            Only marked carriers will be rechecked.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground" data-ff-quotes-recheck-hint="">
            Refresh marks recheck · eye marks hide (session).
          </p>
        )}
      </div>

      <div className="space-y-4 px-3 pb-3">
        {sections.map((section) => {
          const visibleRows =
            hidesEffectivelyApplied
              ? section.rows.filter(({ quote }) => !effectiveHideMarked.includes(quote.id))
              : section.rows;
          if (visibleRows.length === 0 && section.rows.length > 0 && hidesEffectivelyApplied) {
            return null;
          }
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
                    <ChevronRight className="size-4 text-primary" />
                  ) : (
                    <ChevronDown className="size-4 text-primary" />
                  )}
                  <h4 className="text-sm font-semibold text-navy">
                    {collapsed
                      ? `Show declined / no market (${section.rows.length})`
                      : section.label}
                  </h4>
                  {!collapsed ? (
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      {visibleRows.length}
                    </span>
                  ) : null}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <h4 className="text-sm font-semibold text-navy">{section.label}</h4>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {visibleRows.length}
                  </span>
                </div>
              )}

              {collapsed ? null : (
                <div className="space-y-2">
                  {visibleRows.map(({ quote, carrier }) => {
                    const outcome = outcomeFor(quote, carrier.id);
                    const canBind =
                      outcome === "bindable" || quote.nextStep === "can_bind" || quote.bindable;
                    const openHref = carrierOpenHref(quote, carrier);
                    const detailsDefaultOpen = false;
                    const detailsOpen =
                      quote.id in expanded ? Boolean(expanded[quote.id]) : detailsDefaultOpen;
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
                    const isRecheckMarked = recheckMarked.includes(quote.id);
                    const isHideMarked = effectiveHideMarked.includes(quote.id);
                    // Recheck alert: Bindable, or notes with concrete follow-up (e.g. AI 4pt+photos) — not every Conditional.
                    const showAlert = quoteNeedsBindRecheckAlert({
                      riskOutcome: outcome,
                      nextStep: quote.nextStep,
                      bindable: quote.bindable,
                      notes: quote.notes,
                      bindRequirements: quote.bindRequirements,
                    });

                    return (
                      <Fragment key={quote.id}>
                        <article
                          data-ff-quote-row={quote.id}
                          data-ff-quote-outcome={outcome}
                          data-ff-quote-recheck-marked={isRecheckMarked ? "1" : "0"}
                          data-ff-quote-hide-marked={isHideMarked ? "1" : "0"}
                          className={cn(
                            "rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
                            isRecheckMarked && "ring-1 ring-primary/35",
                            isHideMarked && !isRecheckMarked && "ring-1 ring-muted-foreground/25",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap">
                            <span
                              data-ff-quote-status-pill={outcome}
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                                riskOutcomePillClass(outcome),
                              )}
                            >
                              {riskOutcomeLabel(outcome)}
                            </span>

                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-semibold text-navy">
                                {carrier.name}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-navy">
                                {formatMoney(quote.premium)}
                              </span>
                              <button
                                type="button"
                                aria-label={
                                  isRecheckMarked
                                    ? `Unmark ${carrier.name} for recheck`
                                    : `Mark ${carrier.name} for recheck`
                                }
                                aria-pressed={isRecheckMarked}
                                data-ff-quote-recheck-mark={quote.id}
                                data-ff-quote-recheck-mark-state={isRecheckMarked ? "lit" : "muted"}
                                onClick={() => toggleRecheckMark(quote.id)}
                                className={cn(
                                  "inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
                                  isRecheckMarked
                                    ? "border-primary/45 bg-primary/10 text-primary shadow-sm hover:bg-primary/20"
                                    : "border-transparent text-muted-foreground/40 hover:border-border hover:bg-muted hover:text-navy hover:shadow-sm hover:scale-105",
                                )}
                                title={
                                  isRecheckMarked
                                    ? "Marked for recheck — click to unmark"
                                    : "Mark for recheck"
                                }
                              >
                                <RecheckMarkIcon lit={isRecheckMarked} />
                              </button>
                              <button
                                type="button"
                                aria-label={
                                  isHideMarked
                                    ? `Unmark ${carrier.name} to hide`
                                    : `Mark ${carrier.name} to hide`
                                }
                                aria-pressed={isHideMarked}
                                data-ff-quote-hide-mark={quote.id}
                                data-ff-quote-hide-mark-state={isHideMarked ? "lit" : "muted"}
                                onClick={() => toggleHideMark(quote.id)}
                                className={cn(
                                  "inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
                                  isHideMarked
                                    ? "border-muted-foreground/40 bg-muted/70 text-navy shadow-sm hover:bg-muted"
                                    : "border-transparent text-muted-foreground/40 hover:border-border hover:bg-muted hover:text-navy hover:shadow-sm hover:scale-105",
                                )}
                                title={
                                  isHideMarked
                                    ? "Marked to hide — click to unmark"
                                    : "Mark to hide (session)"
                                }
                              >
                                <EyeOff
                                  className={cn(
                                    "size-3.5",
                                    isHideMarked ? "text-navy" : "text-muted-foreground/40",
                                  )}
                                  strokeWidth={isHideMarked ? 2.5 : 2}
                                />
                              </button>
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                data-ff-quote-details={quote.id}
                                aria-expanded={detailsOpen}
                                onClick={() => toggleDetails(quote.id, detailsDefaultOpen)}
                                className="hover:bg-muted hover:text-navy hover:shadow-sm"
                              >
                                {detailsOpen ? "Hide details" : "Details"}
                              </Button>
                            </div>

                            {showAlert ? (
                              <button
                                type="button"
                                aria-label={`Bind recheck checklist for ${carrier.name}`}
                                data-ff-quote-bind-alert={quote.id}
                                onClick={() => setAlertQuoteId(quote.id)}
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-fit-flag/55 bg-fit-flag/15 text-fit-flag shadow-sm transition-all duration-150 hover:scale-105 hover:border-fit-flag hover:bg-fit-flag hover:text-white hover:shadow-md"
                                title="Re-check this quote before bind"
                              >
                                <AlertTriangle className="size-3" strokeWidth={2.25} />
                              </button>
                            ) : null}
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

      <BindRecheckAlertDialog
        open={Boolean(alertQuoteId)}
        onOpenChange={(open) => {
          if (!open) setAlertQuoteId(null);
        }}
        carrierName={alertRow?.carrier.name ?? ""}
        quote={alertRow?.quote ?? null}
      />
    </div>
  );
}
