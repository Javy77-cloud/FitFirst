"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type PageFilterChromeValue = {
  canConfigure: boolean;
  moduleId: string;
};

const PageFilterChromeContext = createContext<PageFilterChromeValue | null>(null);

let published: PageFilterChromeValue | null = null;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emit(next: PageFilterChromeValue | null) {
  published = next;
  listeners.forEach((listener) => listener());
}

/** React context for descendants, plus a store so the list ⋯ menu (a sibling) can read it. */
export function PageFilterChromeProvider({
  canConfigure,
  moduleId,
  children,
}: {
  canConfigure: boolean;
  moduleId: string;
  children?: ReactNode;
}) {
  const value = useMemo(() => ({ canConfigure, moduleId }), [canConfigure, moduleId]);

  useEffect(() => {
    emit(value);
    return () => {
      if (published === value || (published?.moduleId === value.moduleId && published?.canConfigure === value.canConfigure)) {
        emit(null);
      }
    };
  }, [value]);

  return <PageFilterChromeContext.Provider value={value}>{children ?? null}</PageFilterChromeContext.Provider>;
}

export function usePageFilterChrome(): PageFilterChromeValue | null {
  const fromContext = useContext(PageFilterChromeContext);
  const fromStore = useSyncExternalStore(subscribe, () => published, () => null);
  return fromContext ?? fromStore;
}

export { PageFilterChromeContext };
