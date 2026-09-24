"use client";

import type { ReactNode } from "react";

export type RecordTabPanel = {
  id: string;
  children: ReactNode;
};

/**
 * True swapping tab panels — only the active panel mounts in the main column.
 * Sticky header / right rail stay outside this shell (page owns those).
 */
export function RecordTabShell({
  activeId,
  panels,
  empty,
}: {
  activeId: string;
  panels: RecordTabPanel[];
  empty?: ReactNode;
}) {
  const active = panels.find((panel) => panel.id === activeId) ?? panels[0];
  if (!active) return empty ? <>{empty}</> : null;
  return (
    <div className="min-w-0" data-ff-record-tab-shell="" data-ff-active-tab={active.id}>
      <div
        key={active.id}
        id={active.id}
        role="tabpanel"
        data-ff-record-tab-panel={active.id}
        className="min-w-0"
      >
        {active.children}
      </div>
    </div>
  );
}
