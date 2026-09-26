"use client";

import { Check } from "lucide-react";
import { setPipelineStageColor } from "@/app/actions/pipeline-admin";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";
import type { PipelineStageBoard } from "@/lib/wire/pipeline-cards";
import { pipelineTabLabel } from "@/lib/wire/pipeline";
import { cn } from "@/lib/utils";

function colorValue(color: string | null | undefined) {
  return (color || "slate").toLowerCase();
}

function colorOptions(current: string) {
  if ((STATUS_COLOR_KEYS as readonly string[]).includes(current)) return STATUS_COLOR_KEYS;
  return [current, ...STATUS_COLOR_KEYS];
}

/**
 * Agent (and desk) stage menu body: color only.
 * Labels, add, delete, and reorder stay on agency settings.
 */
export function StageColorMenu({
  boards,
  activeId,
  onSelectBoard,
  returnTo,
}: {
  boards: PipelineStageBoard[];
  activeId: string;
  onSelectBoard: (id: string) => void;
  returnTo: string;
}) {
  const active = boards.find((board) => board.id === activeId) ?? boards[0] ?? null;
  const showBoardPicker = boards.length > 1;

  return (
    <div data-ff-stage-color-menu="">
      <p className="px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Stage colors
      </p>
      {showBoardPicker ? (
        <div
          className="flex flex-wrap gap-1 px-2 pb-1"
          role="tablist"
          aria-label="Board to recolor"
          data-ff-stage-color-boards=""
        >
          {boards.map((board) => {
            const on = board.id === active?.id;
            return (
              <button
                key={board.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px]",
                  on ? "border-navy bg-navy text-white" : "border-border bg-card text-navy hover:bg-muted",
                )}
                onClick={() => onSelectBoard(board.id)}
              >
                {pipelineTabLabel(board)}
              </button>
            );
          })}
        </div>
      ) : null}
      {active && active.stages.length > 0 ? (
        <ul className="pb-1">
          {active.stages.map((stage) => {
            const current = colorValue(stage.color);
            return (
              <li key={stage.id} className="px-2 py-1" data-ff-stage-color-row={stage.id}>
                <form action={setPipelineStageColor} className="flex items-center gap-2">
                  <input type="hidden" name="stageId" value={stage.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <span className="min-w-0 flex-1 truncate text-sm text-navy">{stage.name}</span>
                  <label className="sr-only" htmlFor={`agent-stage-color-${stage.id}`}>
                    Color for {stage.name}
                  </label>
                  <select
                    id={`agent-stage-color-${stage.id}`}
                    name="color"
                    defaultValue={current}
                    aria-label={`Color for ${stage.name}`}
                    data-ff-stage-color-picker=""
                    className="h-7 w-[5.75rem] shrink-0 rounded-md border border-input bg-card px-1.5 text-xs capitalize"
                  >
                    {colorOptions(current).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted"
                    aria-label={`Save color for ${stage.name}`}
                    title="Save color"
                    data-ff-stage-save-color=""
                  >
                    <Check className="size-3.5" aria-hidden />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground" data-ff-stage-color-empty="">
          No stages on this board.
        </p>
      )}
    </div>
  );
}
