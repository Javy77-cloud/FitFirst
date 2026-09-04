"use client";

import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { moveDealToStage } from "@/app/actions/pipeline";
import { PipelineDealCard } from "@/components/pipeline/deal-card";
import { cn } from "@/lib/utils";
import { collapsedStorageKey, dealMatchesStage, parseCollapsedStages } from "@/lib/wire/pipeline";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineKanban({
  board,
  cards,
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [overSlug, setOverSlug] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(parseCollapsedStages(window.localStorage.getItem(collapsedStorageKey(board.slug))));
  }, [board.slug]);

  const known = useMemo(() => new Set(board.stages.map((stage) => stage.slug)), [board.stages]);
  const columns = useMemo(() => {
    const extras =
      cards.some((deal) => !board.stages.some((stage) => dealMatchesStage(deal, stage.slug)))
        ? [{ id: "unstaged", slug: "_unstaged", name: "Unstaged", sortOrder: 999, seeded: false }]
        : [];
    return [...board.stages, ...extras];
  }, [board.stages, cards]);

  function persistCollapsed(next: string[]) {
    setCollapsed(next);
    window.localStorage.setItem(collapsedStorageKey(board.slug), JSON.stringify(next));
  }

  function toggle(slug: string, folded: boolean) {
    persistCollapsed(folded ? [...new Set([...collapsed, slug])] : collapsed.filter((item) => item !== slug));
  }

  function dropOn(stageSlug: string, event: DragEvent) {
    event.preventDefault();
    setOverSlug(null);
    const dealId = event.dataTransfer.getData("text/fitfirst-deal");
    if (!dealId || stageSlug === "_unstaged") return;
    startTransition(async () => {
      await moveDealToStage({ dealId, pipelineSlug: board.slug, stageSlug });
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-3">
      {columns.map((stage) => {
        const column =
          stage.slug === "_unstaged"
            ? cards.filter(
                (deal) =>
                  !known.has(deal.pipelineStageSlug ?? "") &&
                  !board.stages.some((item) => dealMatchesStage(deal, item.slug)),
              )
            : cards.filter((deal) => dealMatchesStage(deal, stage.slug));
        const folded = collapsed.includes(stage.slug);
        const foldId = `fold-${board.slug}-${stage.slug}`;
        return (
          <div key={stage.id} className="relative shrink-0">
            <input
              key={`${foldId}-${folded}`}
              id={foldId}
              type="checkbox"
              className="peer sr-only"
              defaultChecked={folded}
              onChange={(event) => toggle(stage.slug, event.target.checked)}
            />
            <section
              onDragOver={(event) => {
                event.preventDefault();
                setOverSlug(stage.slug);
              }}
              onDragLeave={() => setOverSlug((current) => (current === stage.slug ? null : current))}
              onDrop={(event) => dropOn(stage.slug, event)}
              className={cn(
                "ff-card flex w-72 flex-col overflow-hidden transition-[width]",
                "peer-checked:w-12",
                "peer-checked:[&_[data-pipe-cards]]:hidden",
                "peer-checked:[&_[data-pipe-collapse]]:hidden",
                "peer-checked:[&_[data-pipe-expand]]:inline",
                "peer-checked:[&_[data-pipe-head]]:min-h-44",
                "peer-checked:[&_[data-pipe-head]]:flex-col",
                "peer-checked:[&_[data-pipe-title]]:[writing-mode:vertical-rl]",
                "peer-checked:[&_[data-pipe-title]]:rotate-180",
                overSlug === stage.slug && "ring-2 ring-primary",
              )}
            >
              <label
                htmlFor={foldId}
                data-testid={`collapse-${stage.slug}`}
                data-pipe-head
                className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted px-2 py-2 text-left hover:bg-card"
              >
                <span data-pipe-collapse className="rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-navy">
                  Collapse
                </span>
                <span data-pipe-expand className="hidden rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-navy">
                  Expand
                </span>
                <span data-pipe-title className="min-w-0 flex-1 text-sm font-semibold text-navy">
                  {stage.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{column.length}</span>
              </label>
              <div data-pipe-cards className="min-h-40 space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                    Drop a deal here
                  </p>
                ) : (
                  column.map((deal) => (
                    <PipelineDealCard
                      key={deal.id}
                      deal={deal}
                      stageName={stage.name}
                      showArchive={board.slug !== "archive"}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
