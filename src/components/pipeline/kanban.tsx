"use client";

import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  function toggle(slug: string) {
    persistCollapsed(collapsed.includes(slug) ? collapsed.filter((item) => item !== slug) : [...collapsed, slug]);
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
            ? cards.filter((deal) => !known.has(deal.pipelineStageSlug ?? "") && !board.stages.some((item) => dealMatchesStage(deal, item.slug)))
            : cards.filter((deal) => dealMatchesStage(deal, stage.slug));
        const folded = collapsed.includes(stage.slug);
        return (
          <section
            key={stage.id}
            onDragOver={(event) => {
              event.preventDefault();
              setOverSlug(stage.slug);
            }}
            onDragLeave={() => setOverSlug((current) => (current === stage.slug ? null : current))}
            onDrop={(event) => dropOn(stage.slug, event)}
            className={cn(
              "ff-card flex shrink-0 flex-col overflow-hidden transition-[width]",
              folded ? "w-11" : "w-72",
              overSlug === stage.slug && "ring-2 ring-primary",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(stage.slug)}
              aria-expanded={!folded}
              aria-label={folded ? `Expand ${stage.name}` : `Collapse ${stage.name}`}
              data-testid={`collapse-${stage.slug}`}
              className={cn(
                "flex w-full items-center gap-2 border-b border-border bg-muted px-2 py-2 text-left hover:bg-card",
                folded && "min-h-40 flex-col px-1 py-3",
              )}
            >
              {folded ? (
                <ChevronRight className="size-4 shrink-0 text-navy" />
              ) : (
                <ChevronLeft className="size-4 shrink-0 text-navy" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm font-semibold text-navy",
                  folded && "write-vertical flex-none py-2 text-[11px]",
                )}
              >
                {stage.name}
              </span>
              <span className="text-[11px] text-muted-foreground">{column.length}</span>
            </button>
            {folded ? null : (
              <div className="min-h-40 space-y-2 p-2">
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
            )}
          </section>
        );
      })}
    </div>
  );
}
