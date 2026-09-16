"use client";

import { useState, useTransition } from "react";
import { moveDealToStage } from "@/app/actions/pipeline";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import type { DealStageOption } from "@/lib/deals/deal-columns";
import { isClosedOutcomeStage } from "@/lib/deals/archive-reminder";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { isBoardNoopStage } from "@/lib/deals/product-stages";
import { stageColorFromNameOrSlug, statusColorClass } from "@/lib/desk/status-colors";
import { canonicalizePipelineSlug } from "@/lib/wire/pipeline";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

function colorForStage(stage: DealStageOption) {
  return stageColorFromNameOrSlug(stage.name, stage.color);
}

export function DealStageSelect({
  dealId,
  pipelineSlug,
  stageSlug,
  stages,
  toastOnSave = false,
  dealTitle,
  className,
}: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
  stages: DealStageOption[];
  toastOnSave?: boolean;
  dealTitle?: string;
  className?: string;
}) {
  const [value, setValue] = useState(canonicalizePipelineSlug(stageSlug) || stageSlug);
  const [pending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const options = stages.some((stage) => canonicalizePipelineSlug(stage.slug) === value)
    ? stages
    : [{ slug: value, name: humanizeDealStage(value) }, ...stages];
  const current = options.find((stage) => canonicalizePipelineSlug(stage.slug) === value) ?? options[0];
  const currentColor = current ? colorForStage(current) : stageColorFromNameOrSlug(value);

  return (
    <>
      <select
        aria-label="Stage"
        data-ff-deal-stage
        data-stage-color={currentColor}
        className={cn(
          "h-7 max-w-[12rem] rounded-sm border px-1.5 text-[10px] font-semibold tracking-wide",
          statusColorClass(currentColor),
          className,
        )}
        title={current?.name ?? value}
        value={value}
        disabled={pending || options.length === 0}
        onChange={(event) => {
          const next = event.target.value;
          const prev = value;
          if (isBoardNoopStage(next) && pipelineSlug !== "won-lost" && pipelineSlug !== "archive") {
            event.target.value = prev;
            return;
          }
          setValue(next);
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
        }}
      >
        {options.map((stage) => {
          const color = colorForStage(stage);
          const lateLocked =
            isBoardNoopStage(stage.slug) && pipelineSlug !== "won-lost" && pipelineSlug !== "archive";
          return (
            <option
              key={stage.slug}
              value={stage.slug}
              disabled={lateLocked && canonicalizePipelineSlug(stage.slug) !== value}
              data-stage-color={color}
              className={statusColorClass(color)}
            >
              {stage.name}
            </option>
          );
        })}
      </select>
      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
