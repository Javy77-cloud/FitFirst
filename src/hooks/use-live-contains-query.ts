"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getLiveQuery,
  hydrateLiveQuery,
  isLiveQueryHydrated,
  subscribeLiveQuery,
} from "@/lib/search/live-query";

export function useLiveContainsQuery(moduleId: string, initialQuery = "") {
  useEffect(() => {
    hydrateLiveQuery(moduleId, initialQuery);
  }, [moduleId, initialQuery]);

  return useSyncExternalStore(
    (listener) => subscribeLiveQuery(moduleId, listener),
    () => (isLiveQueryHydrated(moduleId) ? getLiveQuery(moduleId) : initialQuery),
    () => initialQuery,
  );
}
