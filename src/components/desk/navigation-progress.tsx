"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hrefFromClickTarget, isInternalDeskNavigation } from "@/lib/desk/interaction-pending";

export function NavigationProgress() {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname, search]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = hrefFromClickTarget(event.target);
      if (!href) return;
      if (
        !isInternalDeskNavigation(href, {
          pathname,
          search: search.toString() ? `?${search.toString()}` : "",
          origin: window.location.origin,
        })
      ) {
        return;
      }
      setPending(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, search]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;
  return <div className="ff-nav-progress" role="progressbar" aria-label="Loading page" data-ff-nav-progress="" />;
}
