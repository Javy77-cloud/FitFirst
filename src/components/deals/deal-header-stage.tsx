"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markDealProductLost, setDealProductStage } from "@/app/actions/product-stage";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import { DealPipelineActions } from "@/components/deals/deal-pipeline-actions";
import { OutsideStageOverrideDialog } from "@/components/deals/outside-stage-override-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DealStageOption } from "@/lib/deals/deal-columns";
import { isClosedOutcomeStage } from "@/lib/deals/archive-reminder";
import { nextAdvanceStage, stageChipLabel } from "@/lib/deals/header-stage";
import {
  isLateProductStage,
  lateStageNeedsQuoteSelection,
  PRODUCT_LOST_REASON_LABELS,
  PRODUCT_LOST_REASONS,
} from "@/lib/deals/product-stages";
import { stageColorFromNameOrSlug } from "@/lib/desk/status-colors";
import { flashAction } from "@/lib/flash-client";
import { OPEN_ISSUED_POLICY_UPLOAD } from "@/components/deal/issue-policy-from-dec";
import { isBoundReadyForIssue, isPolicyIssuedStage, mintFailureFlashText, mintFailureToast } from "@/lib/policy/mint-gate";
import { cn } from "@/lib/utils";

function colorForStage(stage: DealStageOption) {
  return stageColorFromNameOrSlug(stage.name, stage.color);
}

export type HeaderQuoteChoice = {
  id: string;
  carrierName: string;
  premium?: string | null;
};

export function DealHeaderStage({
  dealId,
  pipelineSlug,
  stageSlug,
  stages,
  toastOnSave = false,
  dealTitle,
  product,
  selectedQuoteIds = [],
  quoteChoices = [],
  workspaceTab = "details",
  /** Quote ids that already have a policy/declaration in Manual or the carrier folder. */
  issuedFolderQuoteIds = null,
  outsideOverride = false,
  onHold = false,
}: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
  stages: DealStageOption[];
  toastOnSave?: boolean;
  dealTitle?: string;
  product?: string | null;
  selectedQuoteIds?: string[];
  quoteChoices?: HeaderQuoteChoice[];
  /** Late stages (Quote sent / Bound / Policy issued / closed) only from Quotes. */
  workspaceTab?: string;
  issuedFolderQuoteIds?: readonly string[] | null;
  /** Quoting/binding happened outside FitFirst — late stages unlocked without live quotes. */
  outsideOverride?: boolean;
  /** Soft-parked via On hold tag (#349). */
  onHold?: boolean;
}) {
  const [value, setValue] = useState(stageSlug);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(selectedQuoteIds);
  const [lostReason, setLostReason] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const surface = workspaceTab === "quotes" ? "quotes" : "header";
  const options = stages.some((stage) => stage.slug === value)
    ? stages
    : [{ slug: value, name: stageChipLabel(value), color: null }, ...stages];
  const current = options.find((stage) => stage.slug === value) ?? options[0];
  const currentColor = current ? colorForStage(current) : stageColorFromNameOrSlug(value);
  const currentLabel = stageChipLabel(current ?? value);
  const advance = nextAdvanceStage(value, options);

  useEffect(() => {
    setValue(stageSlug);
  }, [stageSlug, product]);

  useEffect(() => {
    setPicked(selectedQuoteIds);
  }, [selectedQuoteIds]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function livePicked(ids: string[] = picked) {
    const live = new Set(quoteChoices.map((quote) => quote.id));
    return ids.filter((id) => live.has(id));
  }

  function commit(next: string, quoteIds = picked) {
    if (!next || next === value || pending) return;
    const validIds = livePicked(quoteIds);
    if (lateStageNeedsQuoteSelection({ stage: next, selectedQuoteIds: validIds, liveQuoteIds: [...quoteChoices.map((q) => q.id)], outsideOverride })) {
      setPendingStage(next);
      setPickOpen(true);
      setOpen(false);
      return;
    }
    if (
      isPolicyIssuedStage(next) &&
      isBoundReadyForIssue(value) &&
      issuedFolderQuoteIds &&
      !validIds.some((id) => issuedFolderQuoteIds.includes(id))
    ) {
      setOpen(false);
      window.dispatchEvent(
        new CustomEvent(OPEN_ISSUED_POLICY_UPLOAD, {
          detail: { dealId, product: product || "homeowners" },
        }),
      );
      router.push(
        `/deals/${dealId}?tab=quotes&product=${product || "homeowners"}&issue=1`,
      );
      return;
    }
    const prev = value;
    setValue(next);
    setOpen(false);
    startTransition(async () => {
      const result = await setDealProductStage({
        dealId,
        product: product || "homeowners",
        stageSlug: next,
        pipelineSlug,
        selectedQuoteIds: validIds,
        surface,
      });
      if (!result.ok) {
        setValue(prev);
        if (result.reason === "need_quote") {
          setPendingStage(next);
          setPickOpen(true);
        } else if (result.reason === "quotes_only" || result.reason === "need_dec") {
          router.push(
            `/deals/${dealId}?tab=quotes&product=${product || "homeowners"}${next === "policy_issued" || result.reason === "need_dec" ? "&issue=1" : ""}`,
          );
        } else if (
          result.reason === "need_dec_file" ||
          result.reason === "need_gemini" ||
          result.reason === "extract_failed" ||
          result.reason === "need_dec_fields"
        ) {
          const toast = mintFailureToast(result.reason);
          flashAction(mintFailureFlashText(result), toast.kind);
        }
        return;
      }
      if (next === "policy_issued" && "policyId" in result && result.policyId) {
        router.push(`/policies/${result.policyId}`);
        return;
      }
      if (toastOnSave) flashAction("deal-updated");
      if (isClosedOutcomeStage(next)) {
        setArchiveOpen(true);
      } else if (isClosedOutcomeStage(prev) && !isClosedOutcomeStage(next)) {
        setArchiveOpen(false);
      }
    });
  }

  function pick(next: string) {
    if (!next || next === value || pending) return;
    if (isLateProductStage(next) && workspaceTab !== "quotes") {
      setOpen(false);
      return;
    }
    if (next === "closed_lost") {
      if (workspaceTab !== "quotes") {
        setOpen(false);
        return;
      }
      setPendingStage(next);
      setLostOpen(true);
      setOpen(false);
      return;
    }
    if (
      lateStageNeedsQuoteSelection({
        stage: next,
        selectedQuoteIds: livePicked(),
        liveQuoteIds: quoteChoices.map((quote) => quote.id),
        outsideOverride,
      })
    ) {
      setPendingStage(next);
      setPickOpen(true);
      setOpen(false);
      return;
    }
    commit(next, livePicked());
  }

  return (
    <div
      className="relative min-w-0"
      ref={rootRef}
      data-ff-header-stage-control=""
      data-ff-product-stage={product ?? ""}
      data-ff-pipeline-chrome=""
    >
      <div
        className="inline-flex max-w-full flex-col gap-1.5 rounded-lg border border-navy/20 bg-navy/[0.04] px-2.5 py-2 shadow-sm"
        data-ff-pipeline-box=""
      >
        {/* Shell dt already says Pipeline — stage chip + Actions sit under that one title. */}
        <div className="flex flex-wrap items-center gap-2" data-ff-pipeline-stage-row="">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="true"
            aria-label={`Stage ${currentLabel}. Click to change.`}
            data-ff-deal-stage=""
            data-ff-header-stage-chip=""
            data-ff-pipeline-current=""
            data-stage-color={currentColor}
            disabled={pending || options.length === 0}
            title={currentLabel}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex max-w-full items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 disabled:opacity-60"
          >
            <StatusBadge
              color={currentColor}
              uppercase={false}
              className="max-w-none whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold shadow-sm ring-2 ring-navy/25"
            >
              {currentLabel}
            </StatusBadge>
          </button>
          <DealPipelineActions
            dealId={dealId}
            product={product || "homeowners"}
            pipelineSlug={pipelineSlug}
            dealTitle={dealTitle}
            currentStage={value}
            onHold={onHold}
            outsideOverride={outsideOverride}
          />
        </div>
      </div>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-max min-w-[18rem] max-w-[min(42rem,calc(100vw-2rem))] rounded-lg border-2 border-navy/15 bg-card p-3 shadow-lg"
          data-ff-header-stage-strip=""
          data-ff-pipeline-stepper=""
          role="listbox"
          aria-label="Product stages"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Deal pipeline
          </p>
          {advance ? (
            <button
              type="button"
              data-ff-header-stage-advance=""
              disabled={pending}
              onClick={() => pick(advance.slug)}
              className="mb-2 inline-flex w-full items-center justify-between gap-2 rounded-md border border-navy/20 bg-navy/5 px-2.5 py-2 text-left text-xs font-semibold text-navy hover:bg-navy/10 disabled:opacity-60"
            >
              <span>Advance to {stageChipLabel(advance)}</span>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {options.map((stage) => {
              const color = colorForStage(stage);
              const label = stageChipLabel(stage);
              const selected = stage.slug === value;
              const lateLocked =
                workspaceTab !== "quotes" &&
                (isLateProductStage(stage.slug) || stage.slug === "closed_lost");
              return (
                <button
                  key={stage.slug}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-ff-header-stage-option={stage.slug}
                  data-stage-color={color}
                  disabled={pending || lateLocked}
                  title={
                    lateLocked
                      ? `${label} — change this from Quotes after selecting a live quote`
                      : label
                  }
                  onClick={() => pick(stage.slug)}
                  className={cn(
                    "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 disabled:opacity-45",
                    selected
                      ? "scale-[1.05] ring-2 ring-navy/50"
                      : "opacity-80 hover:opacity-100",
                  )}
                >
                  <StatusBadge
                    color={color}
                    uppercase={false}
                    className={cn(
                      "max-w-none whitespace-nowrap rounded-full px-2.5",
                      selected ? "py-1 text-[12px] font-bold" : "px-2 text-[11px] font-medium",
                    )}
                  >
                    {label}
                  </StatusBadge>
                </button>
              );
            })}
          </div>
          {!outsideOverride ? (
            <div className="mt-3 border-t border-border pt-2" data-ff-outside-stage-stepper="">
              <OutsideStageOverrideDialog
                dealId={dealId}
                product={product || "homeowners"}
                pipelineSlug={pipelineSlug}
                dealTitle={dealTitle}
                currentStage={value}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="sm:max-w-md" data-ff-choose-quote-dialog="">
          <DialogHeader>
            <DialogTitle>Choose quote first</DialogTitle>
            <DialogDescription>
              Quote sent, Bound, Policy issued, and Closed won need a live selected quote on this product. Use Quotes to change late stages.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-1.5 overflow-auto">
            {quoteChoices.length === 0 ? (
              <li className="space-y-2 text-sm text-muted-foreground">
                <p>No live quotes on this product yet.</p>
                <p>
                  If quoting or binding happened outside FitFirst, use{" "}
                  <button
                    type="button"
                    className="font-semibold text-navy underline-offset-2 hover:underline"
                    data-ff-outside-from-choose-quote=""
                    onClick={() => {
                      setPickOpen(false);
                      setOverrideOpen(true);
                    }}
                  >
                    Quoted outside FitFirst
                  </button>
                  .
                </p>
              </li>
            ) : (
              quoteChoices.map((quote) => (
                <li key={quote.id}>
                  <label className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={picked.includes(quote.id)}
                      onChange={() =>
                        setPicked((current) =>
                          current.includes(quote.id)
                            ? current.filter((id) => id !== quote.id)
                            : [...current, quote.id],
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{quote.carrierName}</span>
                    {quote.premium ? <span className="tabular-nums">{quote.premium}</span> : null}
                  </label>
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!livePicked().length || !pendingStage}
              data-ff-choose-quote-confirm=""
              onClick={() => {
                if (!pendingStage) return;
                const ids = livePicked();
                if (!ids.length) return;
                setPickOpen(false);
                commit(pendingStage, ids);
              }}
            >
              Use selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent className="sm:max-w-md" data-ff-product-lost-dialog="">
          <DialogHeader>
            <DialogTitle>Close this product</DialogTitle>
            <DialogDescription>Captain reason — why this product is lost.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5" data-ff-product-lost-reason="" role="listbox" aria-label="Lost reason">
            {PRODUCT_LOST_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                role="option"
                aria-selected={lostReason === reason}
                data-ff-product-lost-reason-option={reason}
                onClick={() => setLostReason(reason)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-left text-sm",
                  lostReason === reason
                    ? "border-navy bg-navy/5 text-navy"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {PRODUCT_LOST_REASON_LABELS[reason]}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!lostReason}
              data-ff-product-lost-save=""
              onClick={() => {
                const data = new FormData();
                data.set("dealId", dealId);
                data.set("product", product || "homeowners");
                data.set("lostReason", lostReason);
                data.set("pipelineSlug", pipelineSlug);
                startTransition(async () => {
                  await markDealProductLost(data);
                  setValue("closed_lost");
                  setLostOpen(false);
                  // Leave the lost deal screen — back to active deals list.
                  router.push("/deals");
                });
              }}
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OutsideStageOverrideDialog
        dealId={dealId}
        product={product || "homeowners"}
        pipelineSlug={pipelineSlug}
        dealTitle={dealTitle}
        currentStage={value}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        trigger={false}
      />

      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}