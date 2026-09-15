"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { moveDealToStage } from "@/app/actions/pipeline";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import { StatusBadge } from "@/components/status-badge";
import type { DealStageOption } from "@/lib/deals/deal-columns";
import { isClosedOutcomeStage } from "@/lib/deals/archive-reminder";
import { nextAdvanceStage, stageChipLabel } from "@/lib/deals/header-stage";
import { stageColorFromNameOrSlug } from "@/lib/desk/status-colors";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

function colorForStage(stage: DealStageOption) {
  return stageColorFromNameOrSlug(stage.name, stage.color);
}

export function DealHeaderStage({
  dealId,
  pipelineSlug,
  stageSlug,
  stages,
  toastOnSave = false,
  dealTitle,
}: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
  stages: DealStageOption[];
  toastOnSave?: boolean;
  dealTitle?: string;
}) {
  const [value, setValue] = useState(stageSlug);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = stages.some((stage) => stage.slug === value)
    ? stages
    : [{ slug: value, name: stageChipLabel(value), color: null }, ...stages];
  const current = options.find((stage) => stage.slug === value) ?? options[0];
  const currentColor = current ? colorForStage(current) : stageColorFromNameOrSlug(value);
  const currentLabel = stageChipLabel(current ?? value);
  const advance = nextAdvanceStage(value, options);

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

  function pick(next: string) {
    if (!next || next === value || pending) return;
    const prev = value;
    setValue(next);
    setOpen(false);
    startTransition(async () => {
      await moveDealToStage({
        dealId,
        pipelineSlug,
        stageSlug: next,
      });
      if (toastOnSave) flashAction("deal-updated");
      if (isClosedOutcomeStage(next)) {
        setArchiveOpen(true);
      } else if (isClosedOutcomeStage(prev) && !isClosedOutcomeStage(next)) {
        setArchiveOpen(false);
      }
    });
  }

  return (
    <div className="relative min-w-0" ref={rootRef} data-ff-header-stage-control="">
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
          aria-label="Deal stages"
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

      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}
