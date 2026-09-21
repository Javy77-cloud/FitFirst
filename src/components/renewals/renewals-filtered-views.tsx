"use client";

import { useMemo } from "react";
import { RenewalsHostList } from "@/components/renewals/renewals-host-list";
import { RenewalsPriorityStack } from "@/components/renewals/renewals-priority-stack";
import { RenewalsUrgencyBoard } from "@/components/renewals/renewals-urgency-board";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { matchesRenewalContains } from "@/lib/renewal/pipeline-column-filters";
import type { RenewalsViewId } from "@/lib/wire/pipeline";

/** Board (urgency bands), Stack, or List. Live Contains stays client-side. */
export function RenewalsFilteredViews({
  cards,
  view = "board",
  searchModuleId = "renewals-pipeline",
  initialQuery = "",
}: {
  cards: RenewalBoardCard[];
  view?: RenewalsViewId;
  searchModuleId?: string;
  initialQuery?: string;
}) {
  const liveQuery = useLiveContainsQuery(searchModuleId, initialQuery);
  const filtered = useMemo(
    () => cards.filter((card) => matchesRenewalContains(card, liveQuery)),
    [cards, liveQuery],
  );

  if (view === "stack") return <RenewalsPriorityStack cards={filtered} />;
  if (view === "list") return <RenewalsHostList cards={filtered} />;
  return <RenewalsUrgencyBoard cards={filtered} />;
}
