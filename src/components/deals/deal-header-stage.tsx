"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markDealProductLost, setDealProductStage } from "@/app/actions/product-stage";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
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
  lateStageNeedsQuoteSelection,
  PRODUCT_LOST_REASON_LABELS,
  PRODUCT_LOST_REASONS,
} from "@/lib/deals/product-stages";
import { stageColorFromNameOrSlug } from "@/lib/desk/status-colors";
import { flashAction } from "@/lib/flash-client";
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
  const rootRef = useRef<HTMLDivElement>(null);
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
    if (lateStageNeedsQuoteSelection({ stage: next, selectedQuoteIds: validIds, liveQuoteIds: [...quoteChoices.map((q) => q.id)] })) {
      setPendingStage(next);
      setPickOpen(true);
      setOpen(false);
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
      });
      if (!result.ok) {
        setValue(prev);
        if (result.reason === "need_quote") {
          setPendingStage(next);
          setPickOpen(true);
        }
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
    if (next === "closed_lost") {
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
    <div className="relative min-w-0" ref={rootRef} data-ff-header-stage-control="" data-ff-product-stage={product ?? ""}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Stage ${currentLabel}. Click to change.`}
        data-ff-deal-stage=""
        data-ff-header-stage-chip=""
        data-stage-color={currentColor}
        disabled={pending || options.length === 0}
        title={currentLabel}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 disabled:opacity-60"
      >
        <StatusBadge
          color={currentColor}
          uppercase={false}
          className="max-w-none whitespace-nowrap rounded-full px-2"
        >
          {currentLabel}
        </StatusBadge>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-max min-w-[16rem] max-w-[min(36rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-2 shadow-md"
          data-ff-header-stage-strip=""
          role="listbox"
          aria-label="Product stages"
        >
          {advance ? (
            <button
              type="button"
              data-ff-header-stage-advance=""
              disabled={pending}
              onClick={() => pick(advance.slug)}
              className="mb-2 inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-[11px] font-semibold text-navy hover:bg-muted disabled:opacity-60"
            >
              <span>Advance to {stageChipLabel(advance)}</span>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {options.map((stage) => {
              const color = colorForStage(stage);
              const label = stageChipLabel(stage);
              const selected = stage.slug === value;
              return (
                <button
                  key={stage.slug}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-ff-header-stage-option={stage.slug}
                  data-stage-color={color}
                  disabled={pending}
                  title={label}
                  onClick={() => pick(stage.slug)}
                  className={cn(
                    "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 disabled:opacity-60",
                    selected && "ring-2 ring-navy/40",
                  )}
                >
                  <StatusBadge
                    color={color}
                    uppercase={false}
                    className="max-w-none whitespace-nowrap rounded-full px-2"
                  >
                    {label}
                  </StatusBadge>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="sm:max-w-md" data-ff-choose-quote-dialog="">
          <DialogHeader>
            <DialogTitle>Choose quote first</DialogTitle>
            <DialogDescription>
              Quote sent, Bound, Pending inspection, and Closed won need an explicit quote on this product.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-1.5 overflow-auto">
            {quoteChoices.length === 0 ? (
              <li className="text-sm text-muted-foreground">No live quotes on this product yet.</li>
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
                });
              }}
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}