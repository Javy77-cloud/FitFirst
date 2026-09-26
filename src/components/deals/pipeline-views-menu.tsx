"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { StageColorMenu } from "@/components/deals/stage-color-menu";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { PipelineStageBoard, PipelineStageView } from "@/lib/wire/pipeline-cards";
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

function returnPath() {
  const url = new URL(window.location.href);
  url.searchParams.delete("flash");
  url.searchParams.delete("flashKind");
  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

/**
 * ⋯ beside the view chips on Deals and Renewals.
 * Agents get stage colors only. Rename, add, delete, and reorder live in agency settings.
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
  /** Kept so callers can mark admin vs agent. Structure edits are not offered here. */
  canEditStages?: boolean;
}) {
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<{ top: number; right: number } | null>(null);
  const [returnTo, setReturnTo] = useState("/deals");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const boards = boardsFromProps(pipelineId, stages, stageBoards);
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
      <button type="button" aria-label="Pipeline menu" title="Stage colors" className={triggerClass}>
        <MoreHorizontal className="size-3.5" />
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Pipeline menu"
        title="Stage colors"
        data-ff-pipeline-views-menu=""
        data-ff-can-edit-stages={canEditStages ? "true" : "false"}
        onClick={() => {
          setReturnTo(returnPath());
          setOpen((current) => !current);
        }}
        className={triggerClass}
      >
        <MoreHorizontal className="size-3.5" />
        <span className="sr-only">Stage colors</span>
      </button>
      {open && panel && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              data-ff-pipeline-views-menu-panel=""
              data-ff-agent-stage-menu=""
              className="fixed z-[80] max-h-[min(70vh,32rem)] w-[18.5rem] overflow-y-auto rounded-md border border-border bg-card py-1 text-sm shadow-md"
              style={{ top: panel.top, right: panel.right }}
            >
              <StageColorMenu
                boards={boards}
                activeId={activeId}
                onSelectBoard={setActiveId}
                returnTo={returnTo}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
