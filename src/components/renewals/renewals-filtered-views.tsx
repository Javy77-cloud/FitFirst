"use client";

import { useMemo } from "react";
import { RenewalsFunnel } from "@/components/renewals/renewals-funnel";
import { RenewalsKanban } from "@/components/renewals/renewals-kanban";
import { RenewalsTable } from "@/components/renewals/renewals-table";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import type { PipelineViewId } from "@/lib/wire/pipeline";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { matchesRenewalContains } from "@/lib/renewal/pipeline-column-filters";

/** Board / funnel / grid — live Contains. List stays on DeskColumnTable (server). */
export function RenewalsFilteredViews({
  cards,
  stages,
  view,
  pipeline,
  viewExtras,
  searchModuleId = "renewals-pipeline",
  initialQuery = "",
  canDrag = true,
}: {
  cards: RenewalBoardCard[];
  stages: Array<{ id: string; slug: string; name: string; sortOrder: number; color: string; seeded: boolean }>;
  view: Exclude<PipelineViewId, "list"> | "grid" | "board" | "funnel";
  pipeline?: string | null;
  viewExtras?: { pcSub?: string | null; lifeSub?: string | null; healthSub?: string | null };
  searchModuleId?: string;
  initialQuery?: string;
  canDrag?: boolean;
}) {
  const liveQuery = useLiveContainsQuery(searchModuleId, initialQuery);
  const filtered = useMemo(
    () => cards.filter((card) => matchesRenewalContains(card, liveQuery)),
    [cards, liveQuery],
  );

  if (view === "grid") {
    return <RenewalsTable cards={filtered} />;
  }
  if (view === "funnel") {
    return (
      <RenewalsFunnel
        stages={stages}
        cards={filtered}
        pipeline={pipeline}
        viewExtras={viewExtras}
      />
    );
  }
  return <RenewalsKanban stages={stages} cards={filtered} canDrag={canDrag} />;
}
