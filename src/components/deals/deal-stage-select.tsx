"use client";

import { useState, useTransition } from "react";
import { moveDealToStage } from "@/app/actions/pipeline";
import type { DealStageOption } from "@/lib/deals/deal-columns";

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

  return (
    <select
      aria-label="Stage"
      data-ff-deal-stage
      className="h-8 max-w-[11rem] rounded-md border border-input bg-card px-2 text-sm"
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
      {options.map((stage) => (
        <option key={stage.slug} value={stage.slug}>
          {stage.name}
        </option>
      ))}
    </select>
  );
}
