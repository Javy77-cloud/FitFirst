"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { saveHomeResizeTiles, saveHomeTilePlacements } from "@/app/actions/home-dashboard";
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
  resizeTiles: boolean;
  setResizeTiles: (on: boolean) => void;
};

const HomeLayoutContext = createContext<HomeLayoutApi | null>(null);

export function HomeLayoutProvider({
  scope,
  initialPlacements = null,
  initialResizeTiles = false,
  customLayoutId = null,
  children,
}: {
  scope: { role: string; agentUserId?: string | null };
  initialPlacements?: WidgetPlacement[] | null;
  initialResizeTiles?: boolean;
  customLayoutId?: string | null;
  children: ReactNode;
}) {
  const key = homeLayoutStorageKey(scope);
  const [layout, setLayout] = useState<WidgetPlacement[]>(
    initialPlacements ? mergeHomeLayout(initialPlacements) : DEFAULT_HOME_LAYOUT,
  );
  const [resizeTiles, setResizeTilesState] = useState(Boolean(initialResizeTiles));
  const persistTimer = useRef<number | null>(null);
  const placementsRef = useRef(initialPlacements);
  placementsRef.current = initialPlacements;
  const serverBoard = customLayoutId
    ? `${customLayoutId}:${(initialPlacements ?? []).map((row) => `${row.id}:${row.span}`).join("|")}`
    : "";

  useEffect(() => {
    setResizeTilesState(Boolean(initialResizeTiles));
  }, [initialResizeTiles]);

  useEffect(() => {
    if (customLayoutId && placementsRef.current) {
      setLayout(mergeHomeLayout(placementsRef.current));
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      setLayout(mergeHomeLayout(raw ? JSON.parse(raw) : null));
    } catch {
      setLayout(DEFAULT_HOME_LAYOUT);
    }
  }, [key, customLayoutId, serverBoard]);

  const persistServer = useCallback(
    (next: WidgetPlacement[]) => {
      if (!customLayoutId) return;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        const form = new FormData();
        form.set("layoutId", customLayoutId);
        form.set("placements", JSON.stringify(next));
        void saveHomeTilePlacements(form);
      }, 400);
    },
    [customLayoutId],
  );

  useEffect(() => {
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, []);

  const persist = useCallback(
    (next: WidgetPlacement[]) => {
      setLayout(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
      persistServer(next);
    },
    [key, persistServer],
  );

  const value = useMemo<HomeLayoutApi>(
    () => ({
      layout,
      setSpan: (id, span) => persist(setWidgetSpan(layout, id, span)),
      move: (fromId, toId) => persist(moveWidget(layout, fromId, toId)),
      reset: () => persist(DEFAULT_HOME_LAYOUT),
      resizeTiles,
      setResizeTiles: (on) => {
        setResizeTilesState(on);
        const form = new FormData();
        form.set("resizeTiles", on ? "1" : "0");
        void saveHomeResizeTiles(form);
      },
    }),
    [layout, persist, resizeTiles],
  );

  return <HomeLayoutContext.Provider value={value}>{children}</HomeLayoutContext.Provider>;
}

export function useHomeLayout() {
  const ctx = useContext(HomeLayoutContext);
  if (!ctx) throw new Error("useHomeLayout must be used inside HomeLayoutProvider");
  return ctx;
}
