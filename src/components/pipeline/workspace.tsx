"use client";

import { PipelineFieldPicker } from "@/components/pipeline/field-picker";
import { PipelineFunnelView } from "@/components/pipeline/funnel-view";
import { PipelineKanban } from "@/components/pipeline/kanban";
import { PipelineStageEditor } from "@/components/pipeline/stage-editor";
import { PipelineTableView } from "@/components/pipeline/table-view";
import type { PipelineViewId } from "@/lib/wire/pipeline";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineWorkspace({
  board,
  cards,
  view,
  stageFilter,
  canEditStages = false,
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
  view: PipelineViewId;
  stageFilter?: string | null;
  canEditStages?: boolean;
}) {
  const hint =
    board.slug === "won-lost"
      ? "Closed Won and Closed Lost from every shopping board. Archive is its own tab — parking here does not cancel emails hung on won date."
      : board.slug === "archive"
        ? "Parked deals only. Drag a Closed Won shop here later; won-date emails stay queued."
        : board.slug === "flood"
          ? "Flood shopping board. Same columns as the other lines — add, remove, or reorder stages here."
          : view === "funnel"
            ? "Counts by stage. Click a bar to open the table for that stage."
            : "Drag deals between columns. Use the up/down arrow on a stage header to fold it. Call or schedule a meeting from the card.";

  return (
    <div className="space-y-3" data-ff-pipe>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">{hint}</p>
        <PipelineFieldPicker />
      </div>
      {canEditStages ? <PipelineStageEditor pipelineId={board.id} stages={board.stages} /> : null}
      {view === "table" ? (
        <PipelineTableView board={board} cards={cards} stageFilter={stageFilter} />
      ) : view === "funnel" ? (
        <PipelineFunnelView board={board} cards={cards} />
      ) : (
        <PipelineKanban board={board} cards={cards} />
      )}
    </div>
  );
}
