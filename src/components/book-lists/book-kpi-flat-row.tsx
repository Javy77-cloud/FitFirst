"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Measure the widest Contacts KPI chip and lock every chip to that width. */
export function BookKpiFlatRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const chips = [...root.querySelectorAll<HTMLElement>(".ff-book-kpi-item")];
    if (!chips.length) return;
    for (const chip of chips) {
      chip.style.width = "max-content";
      chip.style.flex = "0 0 auto";
      chip.style.minWidth = "0";
      chip.style.maxWidth = "none";
    }
    const widest = Math.ceil(Math.max(...chips.map((chip) => chip.getBoundingClientRect().width)));
    if (widest > 0) root.style.setProperty("--ff-contacts-kpi-width", `${widest}px`);
    for (const chip of chips) {
      chip.style.width = "";
      chip.style.flex = "";
      chip.style.minWidth = "";
      chip.style.maxWidth = "";
    }
  }, [children]);

  return (
    <section
      ref={ref}
      className="ff-book-kpi ff-book-kpi-flat"
      data-ff-book-kpi="flat"
      aria-label={label}
    >
      {children}
    </section>
  );
}
