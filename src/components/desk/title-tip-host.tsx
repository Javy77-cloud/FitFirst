"use client";

import { useEffect, useState } from "react";

type TipState = {
  text: string;
  x: number;
  y: number;
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
        setTip({
          text,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
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
      className="ff-title-tip pointer-events-none fixed z-[9999] max-w-xs -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
