"use client";

import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { moveDealToStage } from "@/app/actions/pipeline";
import { PipelineDealCard } from "@/components/pipeline/deal-card";
import { StagePill } from "@/components/fit-badge";
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
        ? [{ id: "unstaged", slug: "_unstaged", name: "Unstaged", sortOrder: 999, color: "slate", seeded: false }]
        : [];
    return [...board.stages, ...extras];
  }, [board.stages, cards]);

  function persistCollapsed(next: string[]) {
    setCollapsed(next);
    window.localStorage.setItem(collapsedStorageKey(board.slug), JSON.stringify(next));
  }

  function toggle(slug: string) {
    persistCollapsed(
      collapsed.includes(slug) ? collapsed.filter((item) => item !== slug) : [...new Set([...collapsed, slug])],
    );
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
              "ff-card flex w-72 shrink-0 flex-col overflow-hidden",
              overSlug === stage.slug && "ring-2 ring-primary",
            )}
          >
            <div
              data-pipe-head
              className="flex items-center gap-2 border-b border-border bg-muted px-2 py-2"
            >
              <span data-pipe-title className="min-w-0 flex-1">
                <StagePill stage={stage.name} color={"color" in stage ? stage.color : undefined} />
              </span>
              <span className="text-[11px] text-muted-foreground">{column.length}</span>
              <button
                type="button"
                data-testid={`collapse-${stage.slug}`}
                aria-expanded={!folded}
                aria-label={folded ? `Expand ${stage.name}` : `Collapse ${stage.name}`}
                onClick={() => toggle(stage.slug)}
                className="inline-flex size-6 items-center justify-center rounded border border-border bg-card text-navy hover:bg-background"
              >
                {folded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </button>
            </div>
            {folded ? null : (
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
                      stageColor={"color" in stage ? stage.color : undefined}
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
