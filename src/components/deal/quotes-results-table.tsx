"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  acceptQuoteFloorAndRecheckAction,
  clearBindRecheckAckAction,
  recheckQuotesAction,
  saveBindRecheckAckAction,
  saveQuoteAgentRatingAction,
} from "@/app/actions/quotes";
import { QuoteNotePad } from "@/components/deal/quote-note-pad";
import { isBoundQuote } from "@/lib/deals/status-stamp";
import { quoteRowReason } from "@/lib/quotes/row-reason";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BIND_GATE_COPY,
  bindGateReady,
  canBindAfterRecheckAck,
  clearBindRecheckReasonOk,
  quoteBindRecheckAcked,
} from "@/lib/deals/bind-gate";
import { formatMoney } from "@/lib/domain";
import type { Carrier, Quote, QuoteNote } from "@/lib/db/schema";
import {
  bindRequirementChips,
  minCoverageANotMetAmount,
  quoteNeedsBindRecheckAlert,
  groupQuotesBySection,
  normalizeRiskOutcome,
  riskOutcomeLabel,
  riskOutcomePillClass,
  type RiskOutcome,
} from "@/lib/quotes/outcomes";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { QuoteFileActions, type QuoteFileRow } from "@/components/deal/quote-file-actions";
import { QuoteCompareDialog, type QuoteCompareColumn } from "@/components/deal/quote-compare-dialog";
import {
  canAddToCompare,
  QUOTE_COMPARE_TIP,
  sortByPremiumAsc,
  toggleCompareSelection,
} from "@/lib/quotes/compare-selection";
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
  dealId,
  requestedCoverageA = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierName: string;
  quote: Quote | null;
  dealId: string;
  requestedCoverageA?: number | null;
}) {
  const alreadyAcked = quoteBindRecheckAcked(quote?.bindRecheckAckedAt);
  const [checks, setChecks] = useState({ premium: false, coverages: false, deductibles: false });
  const [acceptFloor, setAcceptFloor] = useState(false);
  const [clearReason, setClearReason] = useState("");
  const [reQuotePending, startReQuote] = useTransition();
  const [savePending, startSave] = useTransition();
  const checklistKey = `${quote?.id ?? "none"}:${open ? "open" : "closed"}`;

  const minCovANotMet = useMemo(() => {
    if (!quote) return null;
    return minCoverageANotMetAmount({
      notes: quote.notes,
      gaps: quote.coverageGaps,
      bindRequirements: quote.bindRequirements,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      requestedCoverageA,
    });
  }, [quote, requestedCoverageA]);

  function resetLocal() {
    setChecks({ premium: false, coverages: false, deductibles: false });
    setAcceptFloor(false);
    setClearReason("");
  }

  const verifyReady = alreadyAcked || bindGateReady(checks);
  const showFloorOverride = minCovANotMet != null;
  const canReQuote = showFloorOverride && acceptFloor && verifyReady;
  const floorLabel =
    minCovANotMet != null ? minCovANotMet.toLocaleString("en-US") : "";

  function onReQuote() {
    if (!quote || minCovANotMet == null || !canReQuote) return;
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quote.id);
    data.set("acceptedCoverageA", String(minCovANotMet));
    startReQuote(async () => {
      await acceptQuoteFloorAndRecheckAction(data);
      resetLocal();
      onOpenChange(false);
    });
  }

  function onSave() {
    if (!quote || alreadyAcked || !bindGateReady(checks)) return;
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quote.id);
    data.set("premium", checks.premium ? "1" : "0");
    data.set("coverages", checks.coverages ? "1" : "0");
    data.set("deductibles", checks.deductibles ? "1" : "0");
    startSave(async () => {
      await saveBindRecheckAckAction(data);
      resetLocal();
      onOpenChange(false);
    });
  }

  function onClearAck() {
    if (!quote || !alreadyAcked || !clearBindRecheckReasonOk(clearReason)) return;
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quote.id);
    data.set("reason", clearReason.trim());
    startSave(async () => {
      await clearBindRecheckAckAction(data);
      resetLocal();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetLocal();
        else resetLocal();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        data-ff-quote-bind-alert-dialog={quote?.id ?? ""}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full",
                alreadyAcked
                  ? "bg-fit-green-bg text-fit-green"
                  : "bg-fit-flag/20 text-fit-flag",
              )}
            >
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
          <p
            className="text-sm font-medium text-navy"
            data-ff-quote-bind-alert-verify-prompt=""
          >
            {BIND_GATE_COPY.verifyPrompt}
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
                checked={alreadyAcked || checks[key]}
                disabled={alreadyAcked}
                onChange={(event) =>
                  setChecks((current) => ({ ...current, [key]: event.target.checked }))
                }
                className="mt-0.5 accent-[var(--fit-flag,#d97706)]"
                data-ff-quote-bind-alert-check={key}
              />
              <span>{label}</span>
            </label>
          ))}
          {alreadyAcked ? (
            <p className="text-xs text-fit-green" data-ff-quote-bind-alert-acked="">
              {BIND_GATE_COPY.ackedHint}
            </p>
          ) : !verifyReady ? (
            <p className="text-xs text-fit-flag" data-ff-quote-bind-alert-blocked="">
              {BIND_GATE_COPY.blocked}
            </p>
          ) : null}
        </div>
        {alreadyAcked ? (
          <div
            className="space-y-2 rounded-lg border border-border bg-muted/40 p-3"
            data-ff-quote-bind-alert-uncheck=""
          >
            <h4 className="text-sm font-semibold text-navy">{BIND_GATE_COPY.uncheckHeading}</h4>
            <label className="block space-y-1 text-sm text-navy">
              <span>{BIND_GATE_COPY.uncheckReason}</span>
              <textarea
                value={clearReason}
                onChange={(event) => setClearReason(event.target.value)}
                rows={2}
                className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                data-ff-quote-bind-alert-uncheck-reason=""
              />
            </label>
            {!clearBindRecheckReasonOk(clearReason) ? (
              <p className="text-xs text-fit-flag" data-ff-quote-bind-alert-uncheck-blocked="">
                {BIND_GATE_COPY.uncheckBlocked}
              </p>
            ) : null}
          </div>
        ) : null}
        {showFloorOverride ? (
          <div
            className="space-y-2 rounded-lg border border-fit-flag/30 bg-fit-flag/5 p-3"
            data-ff-quote-bind-alert-floor-override=""
          >
            <h4 className="text-sm font-semibold text-navy">{BIND_GATE_COPY.acceptFloorHeading}</h4>
            <label className="flex items-start gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={acceptFloor}
                onChange={(event) => setAcceptFloor(event.target.checked)}
                className="mt-0.5 accent-[var(--fit-flag,#d97706)]"
                data-ff-quote-bind-alert-check="accept-floor"
              />
              <span>
                {`Accept Coverage A $${floorLabel} for this quote (meet carrier minimum)`}
              </span>
            </label>
            <p className="text-xs text-muted-foreground" data-ff-quote-bind-alert-floor-help="">
              {BIND_GATE_COPY.acceptFloorHelp}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          {alreadyAcked ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!clearBindRecheckReasonOk(clearReason) || savePending}
              onClick={onClearAck}
              data-ff-quote-bind-alert-uncheck-save=""
            >
              {BIND_GATE_COPY.uncheckConfirm}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!bindGateReady(checks) || savePending}
              title={BIND_GATE_COPY.saveTitle}
              onClick={onSave}
              data-ff-quote-bind-alert-save=""
            >
              {BIND_GATE_COPY.save}
            </Button>
          )}
          {showFloorOverride ? (
            <Button
              type="button"
              size="sm"
              disabled={!canReQuote || reQuotePending}
              title={BIND_GATE_COPY.reQuoteTitle}
              onClick={onReQuote}
              data-ff-quote-bind-alert-requote=""
            >
              {BIND_GATE_COPY.reQuote}
            </Button>
          ) : null}
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
  whyByCarrier = {},
  lostReasonByCarrier = {},
  notesByQuote = {},
  requestedCoverageA = null,
  quoteFilesByQuoteId = {},
  boundQuoteId = null,
}: {
  dealId: string;
  rows: Row[];
  formId: string;
  confirmLogs: { carrierId: string; why?: string | null }[];
  resultByCarrier: Record<string, string | undefined>;
  whyByCarrier?: Record<string, string | null | undefined>;
  lostReasonByCarrier?: Record<string, string | null | undefined>;
  notesByQuote?: Record<string, QuoteNote[]>;
  requestedCoverageA?: number | null;
  quoteFilesByQuoteId?: Record<string, { carrier: QuoteFileRow[]; agency: QuoteFileRow[] }>;
  boundQuoteId?: string | null;
}) {
  const list = asList(rows);
  const [recheckMarked, setRecheckMarked] = useState<string[]>([]);
  const [hideMarked, setHideMarked] = useState<string[]>([]);
  const [hidesApplied, setHidesApplied] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [alertQuoteId, setAlertQuoteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [premiumFloors, setPremiumFloors] = useState<Record<string, number>>({});
  const [compareSelected, setCompareSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const sections = useMemo(
    () => groupQuotesBySection(list, (row) => row.quote.riskOutcome),
    [list],
  );
  const compareColumns = useMemo((): QuoteCompareColumn[] => {
    const picked = list.filter((row) => compareSelected.includes(row.quote.id));
    const sorted = sortByPremiumAsc(picked, (row) => row.quote.premium);
    return sorted.map(({ quote, carrier }) => ({
      quoteId: quote.id,
      carrierName: carrier.name,
      premium: quote.premium,
      quoteNumber: quote.quoteNumber,
      coverageA: quote.coverageA,
      aopDeductible: quote.aopDeductible,
      hurricaneDeductible: quote.hurricaneDeductible,
      notes: quote.notes,
      carrierFiles: quoteFilesByQuoteId[quote.id]?.carrier ?? [],
    }));
  }, [list, compareSelected, quoteFilesByQuoteId]);
  const compareCount = compareSelected.length;
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
  const anyDetailsOpen = Object.values(expanded).some(Boolean);

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

  return (
    <div className="space-y-3" data-ff-quotes-recheck-desk="" data-ff-quotes-by-outcome="">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1">
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

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!anyDetailsOpen}
            onClick={() => setExpanded({})}
            data-ff-quotes-collapse-all-details=""
            className="gap-1.5 border-primary/35 bg-primary/5 text-navy hover:bg-primary/10"
            title="Collapse All Open Details"
          >
            Collapse All
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={compareCount === 0}
            onClick={() => setCompareOpen(true)}
            data-ff-quotes-compare=""
            data-ff-quotes-compare-count={compareCount}
            className="gap-1.5 border-primary/35 bg-primary/5 text-navy hover:bg-primary/10"
            title={QUOTE_COMPARE_TIP}
          >
            {compareCount > 0 ? `Compare (${compareCount})` : "Compare"}
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
              title="Show Hide-Marked Quotes Again"
            >
              <EyeOff className="size-3.5 text-muted-foreground" />
              Show Hidden ({hideCount})
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
              Hide Marked ({hideCount})
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
                    const quoteBindable =
                      outcome === "bindable" || quote.nextStep === "can_bind" || quote.bindable;
                    const recheckAcked = quoteBindRecheckAcked(quote.bindRecheckAckedAt);
                    const canBind = canBindAfterRecheckAck({
                      bindable: Boolean(quoteBindable),
                      ackedAt: quote.bindRecheckAckedAt,
                    });
                    const openHref = carrierOpenHref(quote, carrier);
                    const detailsDefaultOpen = false;
                    const detailsOpen =
                      quote.id in expanded ? Boolean(expanded[quote.id]) : detailsDefaultOpen;
                    const rowReason = quoteRowReason({
                      notes: quote.notes,
                      riskOutcome: outcome,
                      coverageGaps: quote.coverageGaps,
                      bindRequirements: quote.bindRequirements,
                      coverageA: quote.coverageA,
                      hurricaneDeductible: quote.hurricaneDeductible,
                      requestedCoverageA,
                      logWhy: whyByCarrier[carrier.id],
                      lostReason: quote.lostReason ?? lostReasonByCarrier[carrier.id],
                      reasonForNo: quote.reasonForNo,
                    });
                    const reqChips = rowReason.chips.length
                      ? rowReason.chips
                      : bindRequirementChips({
                          notes: quote.notes,
                          gaps: quote.coverageGaps,
                          bindRequirements: quote.bindRequirements,
                          coverageA: quote.coverageA,
                          hurricaneDeductible: quote.hurricaneDeductible,
                          requestedCoverageA,
                        });
                    const thread = notesByQuote[quote.id] ?? [];
                    const bound = isBoundQuote({
                      quoteId: quote.id,
                      agentStatus: quote.agentStatus,
                      boundQuoteId,
                    });
                    const isRecheckMarked = recheckMarked.includes(quote.id);
                    const isHideMarked = effectiveHideMarked.includes(quote.id);
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
                          data-ff-quote-bound={bound ? "1" : "0"}
                          data-ff-quote-recheck-marked={isRecheckMarked ? "1" : "0"}
                          data-ff-quote-hide-marked={isHideMarked ? "1" : "0"}
                          className={cn(
                            "rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
                            bound
                              ? "border-fit-flag/70 bg-[color-mix(in_srgb,var(--ff-red-bg)_55%,var(--ff-card))] ring-2 ring-fit-flag/35"
                              : "border-border",
                            isRecheckMarked && !bound && "ring-1 ring-primary/35",
                            isHideMarked && !isRecheckMarked && !bound && "ring-1 ring-muted-foreground/25",
                          )}
                        >
                          <div className="flex flex-wrap items-start gap-2 px-3 py-2.5">
                            {section.key === "bindable" || section.key === "conditional" ? (
                              <label
                                className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center"
                                data-ff-quote-compare-pick={quote.id}
                                title={
                                  compareSelected.includes(quote.id)
                                    ? "Remove From Compare"
                                    : canAddToCompare(compareSelected, quote.id)
                                      ? "Add To Compare (Max 3)"
                                      : "Maximum 3 Quotes"
                                }
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 accent-[var(--ff-navy,#002868)]"
                                  checked={compareSelected.includes(quote.id)}
                                  disabled={
                                    !compareSelected.includes(quote.id) &&
                                    !canAddToCompare(compareSelected, quote.id)
                                  }
                                  onChange={() =>
                                    setCompareSelected((current) =>
                                      toggleCompareSelection(current, quote.id),
                                    )
                                  }
                                  aria-label={`Compare ${carrier.name}`}
                                />
                              </label>
                            ) : null}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                {bound ? (
                                  <span
                                    data-ff-quote-bound-badge=""
                                    className="inline-flex shrink-0 items-center rounded-sm border-2 border-fit-flag px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.12em] text-fit-flag"
                                  >
                                    BOUND
                                  </span>
                                ) : (
                                  <span
                                    data-ff-quote-status-pill={outcome}
                                    className={cn(
                                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                                      riskOutcomePillClass(outcome),
                                    )}
                                  >
                                    {riskOutcomeLabel(outcome)}
                                  </span>
                                )}
                                <span className="truncate text-sm font-semibold text-navy">
                                  {carrier.name}
                                </span>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-navy">
                                  {formatMoney(quote.premium)}
                                </span>
                              </div>
                              {outcome !== "bindable" || !rowReason.provided || rowReason.chips.length ? (
                                <p
                                  className={cn(
                                    "text-[12px] leading-snug",
                                    rowReason.provided ? "text-navy" : "text-fit-flag",
                                  )}
                                  data-ff-quote-row-reason={quote.id}
                                  data-ff-quote-row-reason-provided={rowReason.provided ? "1" : "0"}
                                >
                                  {rowReason.label}
                                  {rowReason.detail ? (
                                    <span className="text-muted-foreground"> · {rowReason.detail}</span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
                                    ? "Marked For Recheck — Click To Unmark"
                                    : "Mark For Recheck"
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
                                    ? "Marked To Hide — Click To Unmark"
                                    : "Mark To Hide (Session)"
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
                              <QuoteNotePad
                                dealId={dealId}
                                quoteId={quote.id}
                                carrierName={carrier.name}
                                notes={thread}
                                disabled={pending}
                              />
                              {showAlert ? (
                                <button
                                  type="button"
                                  aria-label={`Bind recheck checklist for ${carrier.name}`}
                                  data-ff-quote-bind-alert={quote.id}
                                  data-ff-quote-bind-alert-state={recheckAcked ? "acked" : "open"}
                                  onClick={() => setAlertQuoteId(quote.id)}
                                  className={cn(
                                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md border shadow-sm transition-all duration-150 hover:scale-105 hover:shadow-md",
                                    recheckAcked
                                      ? "border-fit-green/55 bg-fit-green-bg text-fit-green hover:border-fit-green hover:bg-fit-green hover:text-white"
                                      : "border-fit-flag/55 bg-fit-flag/15 text-fit-flag hover:border-fit-flag hover:bg-fit-flag hover:text-white",
                                  )}
                                  title={
                                    recheckAcked
                                      ? BIND_GATE_COPY.ackedHint
                                      : "Re-check this quote before bind"
                                  }
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
                              <Button
                                type="button"
                                size="xs"
                                disabled={!canBind}
                                data-ff-quote-bind={quote.id}
                                data-ff-quote-bind-gated={recheckAcked ? "ready" : "blocked"}
                                data-ff-no-hover=""
                                className={cn(
                                  "!bg-[#002868] !text-white !border-[#002868]",
                                  "hover:!bg-[#BF0A30] hover:!text-white hover:!border-[#BF0A30]",
                                  "disabled:!bg-[#002868] disabled:!text-white disabled:!border-[#002868] disabled:opacity-55",
                                )}
                                title={
                                  !quoteBindable
                                    ? "Bind only when Bindable"
                                    : !recheckAcked
                                      ? BIND_GATE_COPY.bindBlockedUntilSave
                                      : "Bind (wire later)"
                                }
                                onClick={() => {
                                  if (!recheckAcked) setAlertQuoteId(quote.id);
                                }}
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
                                  Open In Carrier
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
                                  Open In Carrier
                                </Button>
                              )}
                              <QuoteFileActions
                                dealId={dealId}
                                quoteId={quote.id}
                                carrierName={carrier.name}
                                quote={quote}
                                carrierFiles={quoteFilesByQuoteId[quote.id]?.carrier ?? []}
                                agencyFiles={quoteFilesByQuoteId[quote.id]?.agency ?? []}
                                requestedCoverageA={requestedCoverageA}
                              />
                            </div>
                          </div>

                          {detailsOpen ? (
                            <div
                              data-ff-quote-details-panel={quote.id}
                              className="space-y-3 border-t border-border/70 px-3 py-3 text-xs"
                            >
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Why / bind requirements
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
                                  <p
                                    className="mt-1 text-sm text-navy"
                                    data-ff-quote-details-reason=""
                                  >
                                    {rowReason.label}
                                    {rowReason.detail ? ` — ${rowReason.detail}` : ""}
                                  </p>
                                )}
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

      <QuoteCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        columns={compareColumns}
      />

      <BindRecheckAlertDialog
        open={Boolean(alertQuoteId)}
        onOpenChange={(open) => {
          if (!open) setAlertQuoteId(null);
        }}
        carrierName={alertRow?.carrier.name ?? ""}
        quote={alertRow?.quote ?? null}
        dealId={dealId}
        requestedCoverageA={requestedCoverageA}
      />
    </div>
  );
}
