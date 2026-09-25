"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { PipelineStageEditor } from "@/components/pipeline/stage-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { PipelineStageBoard, PipelineStageView } from "@/lib/wire/pipeline-cards";
import { pipelineTabLabel } from "@/lib/wire/pipeline";
import { cn } from "@/lib/utils";

const triggerClass = cn(
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-navy",
  "hover:bg-muted",
);

function boardsFromProps(
  pipelineId?: string | null,
  stages?: PipelineStageView[],
  stageBoards?: PipelineStageBoard[],
): PipelineStageBoard[] {
  if (stageBoards && stageBoards.length > 0) {
    return stageBoards.filter((board) => Boolean(board.id));
  }
  if (pipelineId) {
    return [{ id: pipelineId, slug: "", name: "", stages: stages ?? [] }];
  }
  return [];
}

/**
 * ⋯ beside List/Grid/Board/Funnel — same on every view.
 * First item: Edit stages (opens dialog). More items can land here later.
 */
export function PipelineViewsMenu({
  pipelineId,
  stages,
  stageBoards,
  canEditStages = false,
}: {
  pipelineId?: string | null;
  stages?: PipelineStageView[];
  stageBoards?: PipelineStageBoard[];
  canEditStages?: boolean;
}) {
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [panel, setPanel] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const boards = boardsFromProps(pipelineId, stages, stageBoards);
  const canStages = Boolean(canEditStages && boards.length > 0);
  const [activeId, setActiveId] = useState(pipelineId || boards[0]?.id || "");

  useEffect(() => {
    if (!open) return;
    function place() {
      const box = buttonRef.current?.getBoundingClientRect();
      if (!box) return;
      setPanel({ top: box.bottom + 4, right: window.innerWidth - box.right });
    }
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  if (!mounted) {
    return (
      <button type="button" aria-label="Pipeline menu" title="More" className={triggerClass}>
        <MoreHorizontal className="size-3.5" />
      </button>
    );
  }

  const active = boards.find((board) => board.id === activeId) ?? boards[0] ?? null;
  const showBoardPicker = boards.length > 1;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Pipeline menu"
        title="More"
        data-ff-pipeline-views-menu=""
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <MoreHorizontal className="size-3.5" />
        <span className="sr-only">More</span>
      </button>
      {open && panel && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              data-ff-pipeline-views-menu-panel=""
              className="fixed z-[80] min-w-[11rem] rounded-md border border-border bg-card py-1 text-sm shadow-md"
              style={{ top: panel.top, right: panel.right }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={!canStages}
                className={cn(
                  "flex w-full px-3 py-1.5 text-left text-navy hover:bg-muted",
                  !canStages && "cursor-not-allowed opacity-50",
                )}
                onClick={() => {
                  if (!canStages) return;
                  if (pipelineId && boards.some((board) => board.id === pipelineId)) {
                    setActiveId(pipelineId);
                  } else if (boards[0]?.id) {
                    setActiveId(boards[0].id);
                  }
                  setOpen(false);
                  setStagesOpen(true);
                }}
              >
                Edit stages
              </button>
            </div>,
            document.body,
          )
        : null}

      <Dialog open={stagesOpen} onOpenChange={setStagesOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto" data-ff-edit-stages-dialog="">
          <DialogHeader>
            <DialogTitle>Edit stages</DialogTitle>

          </DialogHeader>
          {canStages && active ? (
            <div className="space-y-3" data-ff-edit-stages-boards="">
              {showBoardPicker ? (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="tablist"
                  aria-label="Pipeline to edit"
                  data-ff-edit-stages-family=""
                >
                  {boards.map((board) => {
                    const on = board.id === active.id;
                    return (
                      <button
                        key={board.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs",
                          on
                            ? "border-navy bg-navy text-white"
                            : "border-border bg-card text-navy hover:bg-muted",
                        )}
                        onClick={() => setActiveId(board.id)}
                      >
                        {pipelineTabLabel(board)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <PipelineStageEditor pipelineId={active.id} stages={active.stages} bare />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
