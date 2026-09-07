"use client";

import { useState, useTransition } from "react";
import { moveDealToStage } from "@/app/actions/pipeline";
import type { DealStageOption } from "@/lib/deals/deal-columns";
import { stageColorFromNameOrSlug, statusColorClass } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

function colorForStage(stage: DealStageOption) {
  return stageColorFromNameOrSlug(stage.name, stage.color);
}

export function DealStageSelect({
  dealId,
  pipelineSlug,
  stageSlug,
  stages,
}: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
  stages: DealStageOption[];
}) {
  const [value, setValue] = useState(stageSlug);
  const [pending, startTransition] = useTransition();
  const options = stages.some((stage) => stage.slug === value)
    ? stages
    : [{ slug: value, name: value.replaceAll("_", " ") }, ...stages];
  const current = options.find((stage) => stage.slug === value) ?? options[0];
  const currentColor = current ? colorForStage(current) : stageColorFromNameOrSlug(value);

  return (
    <select
      aria-label="Stage"
      data-ff-deal-stage
      data-stage-color={currentColor}
      className={cn(
        "h-8 max-w-[11rem] rounded-md border px-2 text-sm font-semibold uppercase tracking-wide",
        statusColorClass(currentColor),
      )}
      value={value}
      disabled={pending || options.length === 0}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        startTransition(async () => {
          await moveDealToStage({
            dealId,
            pipelineSlug,
            stageSlug: next,
          });
        });
      }}
    >
      {options.map((stage) => {
        const color = colorForStage(stage);
        return (
          <option
            key={stage.slug}
            value={stage.slug}
            data-stage-color={color}
            className={statusColorClass(color)}
          >
            {stage.name}
          </option>
        );
      })}
    </select>
  );
}
