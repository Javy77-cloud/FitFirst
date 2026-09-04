"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_HOME_LAYOUT,
  homeLayoutStorageKey,
  mergeHomeLayout,
  moveWidget,
  setWidgetSpan,
  type HomeWidgetId,
  type WidgetPlacement,
  type WidgetSpan,
} from "@/lib/home/layout";

type HomeLayoutApi = {
  layout: WidgetPlacement[];
  setSpan: (id: HomeWidgetId, span: WidgetSpan) => void;
  move: (fromId: string, toId: string) => void;
  reset: () => void;
};

const HomeLayoutContext = createContext<HomeLayoutApi | null>(null);

export function HomeLayoutProvider({
  scope,
  children,
}: {
  scope: { role: string; agentUserId?: string | null };
  children: ReactNode;
}) {
  const key = homeLayoutStorageKey(scope);
  const [layout, setLayout] = useState<WidgetPlacement[]>(DEFAULT_HOME_LAYOUT);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setLayout(mergeHomeLayout(raw ? JSON.parse(raw) : null));
    } catch {
      setLayout(DEFAULT_HOME_LAYOUT);
    }
  }, [key]);

  const persist = useCallback(
    (next: WidgetPlacement[]) => {
      setLayout(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
    },
    [key],
  );

  const value = useMemo<HomeLayoutApi>(
    () => ({
      layout,
      setSpan: (id, span) => persist(setWidgetSpan(layout, id, span)),
      move: (fromId, toId) => persist(moveWidget(layout, fromId, toId)),
      reset: () => persist(DEFAULT_HOME_LAYOUT),
    }),
    [layout, persist],
  );

  return <HomeLayoutContext.Provider value={value}>{children}</HomeLayoutContext.Provider>;
}

export function useHomeLayout() {
  const ctx = useContext(HomeLayoutContext);
  if (!ctx) throw new Error("useHomeLayout must be used inside HomeLayoutProvider");
  return ctx;
}
