"use client";

import type { ReactNode } from "react";
import { useActivityPick } from "@/components/desk/standard-activity-panel";

/** Card body selects the shared Activity rail. Links and buttons keep their own click. */
export function BookActivityHit({ id, children }: { id: string; children: ReactNode }) {
  const desk = useActivityPick();
  return (
    <div
      className="ff-book-activity-hit"
      data-ff-book-activity=""
      data-ff-activity-selected={desk?.selectedId === id ? "true" : undefined}
      onClick={(event) => {
        if (!desk) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("a, button, input, select, textarea, label, form")) return;
        desk.pick(id);
      }}
    >
      {children}
    </div>
  );
}
