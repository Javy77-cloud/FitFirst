"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  addPipelineStage,
  deletePipelineStage,
  relabelPipelineStage,
  reorderPipelineStage,
  setPipelineStageColor,
} from "@/app/actions/pipeline-admin";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Input } from "@/components/ui/input";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";
import type { PipelineStageView } from "@/lib/wire/pipeline-cards";
import { cn } from "@/lib/utils";

/** Floor so empty boards still size for the usual longest label. */
const NAME_FLOOR = "Pending Inspection";

function nameColumnCh(stages: { name: string }[]): number {
  const longest = stages.reduce((max, stage) => Math.max(max, stage.name.length), NAME_FLOOR.length);
  // +2 for pill padding / select breathing room; keep every row identical width
  return longest + 2;
}

export function PipelineStageEditor({
  pipelineId,
  stages,
  bare = false,
  returnTo,
}: {
  pipelineId: string;
  stages: PipelineStageView[];
  /** Dialog body — no details/summary chrome. */
  bare?: boolean;
  /** Stay on this path after a color save. */
  returnTo?: string;
}) {
  const canDelete = stages.length > 1;
  const nameCh = useMemo(() => nameColumnCh(stages), [stages]);
  const nameWidth = { width: `${nameCh}ch` } as const;

  const body = (
    <>

      <ul className="mt-2 divide-y divide-border/60 rounded-md border border-border/70">
        {stages.map((stage, index) => (
          <StageEditorRow
            key={stage.id}
            stage={stage}
            index={index}
            total={stages.length}
            canDelete={canDelete}
            nameWidth={nameWidth}
            returnTo={returnTo}
          />
        ))}
      </ul>

      <form action={addPipelineStage} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="pipelineId" value={pipelineId} />
        <Input
          name="name"
          required
          placeholder="New stage"
          className="h-7 text-xs"
          style={nameWidth}
        />
        <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs">
          Add
        </Button>
      </form>
    </>
  );

  if (bare) {
    return (
      <div className="space-y-2 text-sm" data-ff-stage-editor="">
        {body}
      </div>
    );
  }

  return (
    <details
      className="rounded-md border border-border bg-card p-2.5 text-sm"
      data-ff-stage-editor=""
    >
      <summary className="cursor-pointer text-sm font-medium text-navy">Edit stages</summary>
      <div className="mt-1 space-y-2">{body}</div>
    </details>
  );
}

function StageEditorRow({
  stage,
  index,
  total,
  canDelete,
  nameWidth,
  returnTo,
}: {
  stage: PipelineStageView;
  index: number;
  total: number;
  canDelete: boolean;
  nameWidth: { width: string };
  returnTo?: string;
}) {
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const previewColor = draftColor ?? stage.color ?? "slate";

  return (
    <li className="flex items-center gap-2 px-2 py-1.5" data-ff-stage-row={stage.id}>
      <div className="shrink-0 overflow-visible" style={nameWidth}>
        <StagePill stage={stage.name} color={previewColor} />
      </div>

      <form action={reorderPipelineStage} className="flex shrink-0 flex-col">
        <input type="hidden" name="stageId" value={stage.id} />
        <button
          type="submit"
          name="direction"
          value="-1"
          disabled={index === 0}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-navy disabled:opacity-30"
          aria-label={`Move ${stage.name} up`}
        >
          <ChevronUp className="size-3.5" aria-hidden />
        </button>
        <button
          type="submit"
          name="direction"
          value="1"
          disabled={index === total - 1}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-navy disabled:opacity-30"
          aria-label={`Move ${stage.name} down`}
        >
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </form>

      <form action={relabelPipelineStage} className="shrink-0">
        <input type="hidden" name="stageId" value={stage.id} />
        <Input
          name="name"
          defaultValue={stage.name}
          className="h-7 text-xs"
          style={nameWidth}
          aria-label={`Name for ${stage.name}`}
          title="Press Enter to rename"
        />
      </form>

      <form action={setPipelineStageColor} className="flex shrink-0 items-center gap-1">
        <input type="hidden" name="stageId" value={stage.id} />
        {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
        <label className="sr-only" htmlFor={`stage-color-${stage.id}`}>
          Color for {stage.name}
        </label>
        <select
          id={`stage-color-${stage.id}`}
          name="color"
          value={previewColor}
          onChange={(event) => setDraftColor(event.target.value)}
          className={cn(
            "h-7 w-[5.75rem] rounded-md border border-input bg-card px-1.5 text-xs capitalize",
          )}
          aria-label={`Color for ${stage.name}`}
        >
          {STATUS_COLOR_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex size-7 items-center justify-center rounded-md text-primary hover:bg-muted"
          aria-label={`Save color for ${stage.name}`}
          title="Save color"
          data-ff-stage-save-color=""
        >
          <Check className="size-3.5" aria-hidden />
        </button>
      </form>

      {canDelete ? (
        <HardDeleteForm
          action={deletePipelineStage}
          subject="this stage"
          className="inline-flex shrink-0"
        >
          <input type="hidden" name="stageId" value={stage.id} />
          <FileDeleteIcon label={`Delete ${stage.name}`} className="size-7 p-1.5" />
        </HardDeleteForm>
      ) : (
        <span className="inline-flex size-7 shrink-0" aria-hidden />
      )}
    </li>
  );
}
