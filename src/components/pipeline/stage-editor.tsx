"use client";

import {
  addPipelineStage,
  deletePipelineStage,
  relabelPipelineStage,
  reorderPipelineStage,
} from "@/app/actions/pipeline-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PipelineStageView } from "@/lib/wire/pipeline-cards";

export function PipelineStageEditor({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: PipelineStageView[];
}) {
  const canDelete = stages.length > 1;

  return (
    <details className="rounded-md border border-border bg-card p-3 text-sm">
      <summary className="cursor-pointer font-medium text-navy">Edit stages</summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Add, rename, remove, or reorder columns on this board. Deals on a removed stage move to the
        next remaining column.
      </p>
      <form action={addPipelineStage} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="pipelineId" value={pipelineId} />
        <Input name="name" required placeholder="New stage name" className="h-8 w-48" />
        <Button type="submit" size="sm" variant="outline">
          Add stage
        </Button>
      </form>
      <ul className="mt-3 space-y-2">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex flex-wrap items-center gap-2">
            <form action={reorderPipelineStage} className="flex items-center gap-0.5">
              <input type="hidden" name="stageId" value={stage.id} />
              <button
                type="submit"
                name="direction"
                value="-1"
                disabled={index === 0}
                className="rounded border border-border px-1.5 text-xs text-navy disabled:opacity-40"
                aria-label={`Move ${stage.name} left`}
              >
                ←
              </button>
              <button
                type="submit"
                name="direction"
                value="1"
                disabled={index === stages.length - 1}
                className="rounded border border-border px-1.5 text-xs text-navy disabled:opacity-40"
                aria-label={`Move ${stage.name} right`}
              >
                →
              </button>
            </form>
            <form action={relabelPipelineStage} className="flex items-center gap-2">
              <input type="hidden" name="stageId" value={stage.id} />
              <Input name="name" defaultValue={stage.name} className="h-8 w-40" />
              <button type="submit" className="text-xs text-primary hover:underline">
                Rename
              </button>
            </form>
            {canDelete ? (
              <form action={deletePipelineStage}>
                <input type="hidden" name="stageId" value={stage.id} />
                <button type="submit" className="text-xs text-destructive hover:underline">
                  Remove
                </button>
              </form>
            ) : (
              <span className="text-[11px] text-muted-foreground">Need one stage</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
