"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { HelpTab } from "@/lib/help/content";

type SupportContextValue = {
  open: boolean;
  tab: HelpTab;
  articleId: string | null;
  openSupport: (opts?: { tab?: HelpTab; articleId?: string | null }) => void;
  closeSupport: () => void;
  setTab: (tab: HelpTab) => void;
  setArticleId: (id: string | null) => void;
};

const SupportContext = createContext<SupportContextValue | null>(null);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("howto");
  const [articleId, setArticleId] = useState<string | null>(null);

  const openSupport = useCallback((opts?: { tab?: HelpTab; articleId?: string | null }) => {
    if (opts?.tab) setTab(opts.tab);
    if (opts && "articleId" in opts) setArticleId(opts.articleId ?? null);
    setOpen(true);
  }, []);

  const closeSupport = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, tab, articleId, openSupport, closeSupport, setTab, setArticleId }),
    [open, tab, articleId, openSupport, closeSupport],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error("useSupport must be used inside SupportProvider");
  return ctx;
}
