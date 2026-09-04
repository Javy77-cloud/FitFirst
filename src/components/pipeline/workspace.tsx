"use client";

import { PipelineFieldPicker } from "@/components/pipeline/field-picker";
import { PipelineKanban } from "@/components/pipeline/kanban";
import { PipelineStageEditor } from "@/components/pipeline/stage-editor";
import { PipelineTableView } from "@/components/pipeline/table-view";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineWorkspace({
  board,
  cards,
  tableView,
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
  tableView: boolean;
}) {
  const hint =
    board.slug === "won-lost"
      ? "Closed Won and Closed Lost from every shopping board. Archive is its own tab — parking here does not cancel emails hung on won date."
      : board.slug === "archive"
        ? "Parked deals only. Drag a Closed Won shop here later; won-date emails stay queued."
        : board.slug === "flood"
          ? "Flood shopping board. Same columns as the other lines — add, remove, or reorder stages here."
          : "Drag deals between columns. Collapse a stage when you do not need it. Bound already wrote the policy.";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">{hint}</p>
        <PipelineFieldPicker />
      </div>
      <PipelineStageEditor pipelineId={board.id} stages={board.stages} />
      {tableView ? (
        <PipelineTableView board={board} cards={cards} />
      ) : (
        <PipelineKanban board={board} cards={cards} />
      )}
    </div>
  );
}
