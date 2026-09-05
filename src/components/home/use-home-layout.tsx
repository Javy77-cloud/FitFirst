"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { persistCustomLayoutPlacements } from "@/app/actions/home-dashboard";
import { placementsForLayout } from "@/lib/home/custom-layouts";
import {
  DEFAULT_HOME_LAYOUT,
  homeLayoutStorageKey,
  mergeHomeLayout,
  moveWidget,
  setWidgetSize,
  setWidgetSpan,
  type HomeWidgetId,
  type NamedHomeLayout,
  type WidgetPlacement,
  type WidgetSpan,
} from "@/lib/home/layout";

type HomeLayoutApi = {
  layout: WidgetPlacement[];
  resizeTiles: boolean;
  activeLayoutId: string | null;
  setSpan: (id: HomeWidgetId, span: WidgetSpan) => void;
  setSize: (id: HomeWidgetId, size: { cols: number; heightPx: number; span?: WidgetSpan }) => void;
  previewSize: (id: HomeWidgetId, size: { cols: number; heightPx: number; span?: WidgetSpan }) => void;
  commit: () => void;
  move: (fromId: string, toId: string) => void;
  reset: () => void;
};

const HomeLayoutContext = createContext<HomeLayoutApi | null>(null);

export function HomeLayoutProvider({
  scope,
  customLayouts = [],
  activeLayoutId = null,
  resizeTiles = false,
  children,
}: {
  scope: { role: string; agentUserId?: string | null };
  customLayouts?: NamedHomeLayout[];
  activeLayoutId?: string | null;
  resizeTiles?: boolean;
  children: ReactNode;
}) {
  const bookKey = homeLayoutStorageKey(scope);
  const key = activeLayoutId ? `${bookKey}:custom:${activeLayoutId}` : bookKey;
  const [layout, setLayout] = useState<WidgetPlacement[]>(() =>
    mergeHomeLayout(placementsForLayout(customLayouts, activeLayoutId)),
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const persistTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        setLayout(mergeHomeLayout(JSON.parse(raw)));
        return;
      }
    } catch {
      /* ignore */
    }
    setLayout(mergeHomeLayout(placementsForLayout(customLayouts, activeLayoutId)));
  }, [key, activeLayoutId, customLayouts]);

  const writeLocal = useCallback(
    (next: WidgetPlacement[]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
    },
    [key],
  );

  const scheduleServer = useCallback(
    (next: WidgetPlacement[]) => {
      if (!activeLayoutId) return;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        const form = new FormData();
        form.set("layoutId", activeLayoutId);
        form.set("placements", JSON.stringify(next));
        void persistCustomLayoutPlacements(form);
      }, 350);
    },
    [activeLayoutId],
  );

  useEffect(() => {
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, []);

  const persist = useCallback(
    (next: WidgetPlacement[], durable = true) => {
      setLayout(next);
      if (!durable) return;
      writeLocal(next);
      scheduleServer(next);
    },
    [scheduleServer, writeLocal],
  );

  const value = useMemo<HomeLayoutApi>(
    () => ({
      layout,
      resizeTiles,
      activeLayoutId,
      setSpan: (id, span) => persist(setWidgetSpan(layout, id, span)),
      setSize: (id, size) => persist(setWidgetSize(layout, id, size)),
      previewSize: (id, size) => persist(setWidgetSize(layout, id, size), false),
      commit: () => persist(layoutRef.current),
      move: (fromId, toId) => persist(moveWidget(layout, fromId, toId)),
      reset: () => persist(DEFAULT_HOME_LAYOUT),
    }),
    [activeLayoutId, layout, persist, resizeTiles],
  );

  return <HomeLayoutContext.Provider value={value}>{children}</HomeLayoutContext.Provider>;
}

export function useHomeLayout() {
  const ctx = useContext(HomeLayoutContext);
  if (!ctx) throw new Error("useHomeLayout must be used inside HomeLayoutProvider");
  return ctx;
}
