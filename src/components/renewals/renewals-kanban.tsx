"use client";

import { useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { moveRenewalBoardCard } from "@/app/actions/renewals-board";
import { RenewalBoardCardView } from "@/components/renewals/renewal-card";
import { StagePill } from "@/components/fit-badge";
import { cn } from "@/lib/utils";
import {
  RENEWAL_QUEUE_STAGE_HINTS,
  RENEWAL_QUEUE_STAGE_LABELS,
  isRenewalQueueStage,
  type RenewalQueueStage,
} from "@/lib/domain-ams";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

const STAGE_COLORS: Record<RenewalQueueStage, string> = {
  upcoming: "slate",
  contacted: "blue",
  quoted: "amber",
  bound: "green",
  lost: "red",
};

export type RenewalsKanbanStage = {
  slug: string;
  name: string;
  color?: string | null;
};

function asKanbanStages(stages: Array<string | RenewalsKanbanStage>): RenewalsKanbanStage[] {
  return stages.map((stage) =>
    typeof stage === "string"
      ? {
          slug: stage,
          name: isRenewalQueueStage(stage) ? RENEWAL_QUEUE_STAGE_LABELS[stage] : stage,
          color: isRenewalQueueStage(stage) ? STAGE_COLORS[stage] : "slate",
        }
      : stage,
  );
}

export function RenewalsKanban({
  stages,
  cards,
  canDrag = true,
}: {
  stages: Array<string | RenewalsKanbanStage>;
  cards: RenewalBoardCard[];
  canDrag?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [overSlug, setOverSlug] = useState<string | null>(null);
  const columns = useMemo(() => asKanbanStages(stages), [stages]);

  const byStage = useMemo(() => {
    const map = new Map<string, RenewalBoardCard[]>();
    for (const stage of columns) map.set(stage.slug, []);
    for (const card of cards) {
      const list = map.get(card.stage) ?? [];
      list.push(card);
      map.set(card.stage, list);
    }
    return map;
  }, [columns, cards]);

  function toggle(slug: string) {
    setCollapsed((cur) =>
      cur.includes(slug) ? cur.filter((item) => item !== slug) : [...cur, slug],
    );
  }

  function dropOn(stageSlug: string, event: DragEvent) {
    event.preventDefault();
    setOverSlug(null);
    if (!canDrag) return;
    const queueId = event.dataTransfer.getData("text/fitfirst-renewal");
    if (!queueId) return;
    startTransition(async () => {
      await moveRenewalBoardCard({ queueId, stageSlug });
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-3" data-ff-renewals-kanban="">
      {columns.map((stage) => {
        const column = byStage.get(stage.slug) ?? [];
        const folded = collapsed.includes(stage.slug);
        const label = stage.name;
        const color =
          stage.color ||
          (isRenewalQueueStage(stage.slug) ? STAGE_COLORS[stage.slug] : "slate");
        const hint = isRenewalQueueStage(stage.slug)
          ? RENEWAL_QUEUE_STAGE_HINTS[stage.slug]
          : "";
        return (
          <section
            key={stage.slug}
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
                <StagePill stage={label} color={color} />
              </span>
              <span className="text-[11px] text-muted-foreground">{column.length}</span>
              <button
                type="button"
                aria-expanded={!folded}
                aria-label={folded ? `Expand ${label}` : `Collapse ${label}`}
                onClick={() => toggle(stage.slug)}
                className="inline-flex size-6 items-center justify-center rounded border border-border bg-card text-navy hover:bg-background"
              >
                {folded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </button>
            </div>
            {hint ? (
              <p className="border-b border-border px-2 py-1 text-[11px] text-muted-foreground">{hint}</p>
            ) : null}
            {folded ? null : (
              <div data-pipe-cards className="min-h-40 space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                    Drop a renewal here
                  </p>
                ) : (
                  column.map((card) => (
                    <RenewalBoardCardView key={card.queueId} card={card} />
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
