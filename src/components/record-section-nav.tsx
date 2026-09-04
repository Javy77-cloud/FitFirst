"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { RecordSectionDef } from "@/lib/desk/business-sections";

export function RecordSectionNav({
  sections,
  ariaLabel = "Record sections",
}: {
  sections: RecordSectionDef[];
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "overview");

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [sections]);

  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="mb-4 flex gap-1 overflow-x-auto rounded-md border border-border bg-card p-2 lg:mb-0 lg:sticky lg:top-4 lg:block lg:overflow-visible"
    >
      <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">
        Jump to
      </p>
      <ul className="flex gap-1 lg:block lg:space-y-0.5">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <button
              type="button"
              onClick={() => jump(section.id)}
              className={cn(
                "w-full rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap",
                active === section.id
                  ? "bg-secondary font-semibold text-navy"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-navy",
              )}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
