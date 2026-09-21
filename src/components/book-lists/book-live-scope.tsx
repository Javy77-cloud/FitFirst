"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { matchesContains } from "@/lib/search/live-query";

/** Hide command cards that miss the header search or this module's contains box. */
export function BookLiveScope({
  moduleId,
  initialQuery = "",
  children,
}: {
  moduleId: string;
  initialQuery?: string;
  children: ReactNode;
}) {
  const pageQuery = useLiveContainsQuery(moduleId, initialQuery);
  const chromeQuery = useLiveContainsQuery("chrome-search", "");
  const query = (chromeQuery.trim() || pageQuery).trim();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let visible = 0;
    for (const card of root.querySelectorAll<HTMLElement>("[data-ff-book-card]")) {
      const show = matchesContains(query, card.dataset.hay);
      const host = (card.closest("li") as HTMLElement | null) ?? card;
      host.hidden = !show;
      if (show) visible += 1;
    }
    const empty = root.querySelector<HTMLElement>("[data-ff-book-live-empty]");
    if (empty) empty.hidden = !query || visible > 0;
  }, [query]);

  return (
    <div ref={ref} data-ff-book-live-scope={moduleId}>
      {children}
      <p className="ff-deals-empty" data-ff-book-live-empty="" hidden>
        No records containing “{query}”.
      </p>
    </div>
  );
}
