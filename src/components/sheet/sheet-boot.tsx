"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Marks the document after React has committed. ff-sheet.js must not stamp
 * data-sheet-index or move rows until this fires, or list pages hydrate dirty.
 * Re-fires on client navigations so saved sort/pin can apply to the new table
 * after that page has hydrated.
 */
export function SheetBoot() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.setAttribute("data-ff-hydrated", "1");
    window.dispatchEvent(new Event("ff-hydrated"));
    window.dispatchEvent(new Event("ff-sheet-route"));
  }, [pathname]);
  return null;
}
