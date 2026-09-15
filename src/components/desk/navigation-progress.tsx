"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  currentDeskPath,
  hrefFromClickTarget,
  resolveInternalDeskPath,
} from "@/lib/desk/interaction-pending";

export function NavigationProgress() {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const here = currentDeskPath({
    pathname,
    search: search.toString() ? `?${search.toString()}` : "",
  });
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pending = pendingHref != null && pendingHref !== here;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = hrefFromClickTarget(event.target);
      if (!href) return;
      const next = resolveInternalDeskPath(href, {
        pathname,
        search: search.toString() ? `?${search.toString()}` : "",
        origin: window.location.origin,
      });
      if (!next || next === here) return;
      setPendingHref(next);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [here, pathname, search]);

  useEffect(() => {
    if (!pendingHref || pendingHref === here) return;
    const timer = window.setTimeout(() => setPendingHref(null), 8000);
    return () => window.clearTimeout(timer);
  }, [here, pendingHref]);

  if (!pending) return null;
  return <div className="ff-nav-progress" role="progressbar" aria-label="Loading page" data-ff-nav-progress="" />;
}
