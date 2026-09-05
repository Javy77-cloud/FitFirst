"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { matchesContains } from "@/lib/search/live-query";

export function LiveContainsScope({
  moduleId,
  initialQuery = "",
  children,
}: {
  moduleId: string;
  initialQuery?: string;
  children: ReactNode;
}) {
  const query = useLiveContainsQuery(moduleId, initialQuery);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const row of root.querySelectorAll<HTMLElement>("[data-hay]")) {
      row.hidden = !matchesContains(query, row.dataset.hay);
    }
  }, [query]);

  return <div ref={ref}>{children}</div>;
}
