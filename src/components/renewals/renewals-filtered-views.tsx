"use client";

import { useMemo } from "react";
import { RenewalsUrgencyBoard } from "@/components/renewals/renewals-urgency-board";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { matchesRenewalContains } from "@/lib/renewal/pipeline-column-filters";

/** Urgency board is the primary renewals surface. Live Contains stays client-side. */
export function RenewalsFilteredViews({
  cards,
  searchModuleId = "renewals-pipeline",
  initialQuery = "",
}: {
  cards: RenewalBoardCard[];
  searchModuleId?: string;
  initialQuery?: string;
}) {
  const liveQuery = useLiveContainsQuery(searchModuleId, initialQuery);
  const filtered = useMemo(
    () => cards.filter((card) => matchesRenewalContains(card, liveQuery)),
    [cards, liveQuery],
  );

  return <RenewalsUrgencyBoard cards={filtered} />;
}
