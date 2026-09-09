"use client";

import { useEffect, useState } from "react";

type TipState = {
  text: string;
  x: number;
  y: number;
  /** Prefer below the control so the tip never covers the click target. */
  place: "below" | "above";
};

/**
 * Site-wide rounded hover tips for native `title` attributes.
 * Browser tooltips are square and unstyleable — we stash the title and show our own.
 */
export function TitleTipHost() {
  const [tip, setTip] = useState<TipState | null>(null);

  useEffect(() => {
    let active: HTMLElement | null = null;
    let savedTitle = "";
    let showTimer: number | null = null;

    function clearTimer() {
      if (showTimer != null) {
        window.clearTimeout(showTimer);
        showTimer = null;
      }
    }

    function restore() {
      clearTimer();
      if (active && savedTitle) {
        active.setAttribute("title", savedTitle);
      }
      active = null;
      savedTitle = "";
      setTip(null);
    }

    function onOver(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("[title]") as HTMLElement | null;
      if (!el) return;
      const text = (el.getAttribute("title") || "").trim();
      if (!text) return;
      if (active === el) return;
      restore();

      active = el;
      savedTitle = text;
      // Hide native square tooltip
      el.removeAttribute("title");
      el.setAttribute("data-ff-tip-active", "1");

      const rect = el.getBoundingClientRect();
      showTimer = window.setTimeout(() => {
        const gap = 10;
        const spaceBelow = window.innerHeight - rect.bottom;
        const place: "below" | "above" = spaceBelow < 56 ? "above" : "below";
        const x = Math.min(Math.max(rect.left + rect.width / 2, 72), window.innerWidth - 72);
        const y = place === "below" ? rect.bottom + gap : rect.top - gap;
        setTip({ text, x, y, place });
      }, 280);
    }

    function onOut(event: MouseEvent) {
      if (!active) return;
      const related = event.relatedTarget;
      if (related instanceof Node && active.contains(related)) return;
      active.removeAttribute("data-ff-tip-active");
      restore();
    }

    function onScroll() {
      if (active) {
        active.removeAttribute("data-ff-tip-active");
        restore();
      }
    }

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      window.removeEventListener("scroll", onScroll, true);
      restore();
    };
  }, []);

  if (!tip) return null;

  return (
    <div
      role="tooltip"
      data-ff-title-tip=""
      data-ff-title-tip-place={tip.place}
      className={
        tip.place === "below"
          ? "ff-title-tip pointer-events-none fixed z-[9999] max-w-xs bg-[#eceef1] -translate-x-1/2 px-2 py-1 text-[11px] leading-snug text-gray-600 shadow-sm"
          : "ff-title-tip pointer-events-none fixed z-[9999] max-w-xs bg-[#eceef1] -translate-x-1/2 -translate-y-full px-2 py-1 text-[11px] leading-snug text-gray-600 shadow-sm"
      }
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
