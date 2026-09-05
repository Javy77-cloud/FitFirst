"use client";

import { useEffect } from "react";
import { sheetFieldDomId } from "@/lib/completeness/fix-href";

export function SheetFieldFocus({ field }: { field?: string | null }) {
  useEffect(() => {
    const key =
      field ||
      (typeof window !== "undefined" && window.location.hash.startsWith("#sheet-field-")
        ? window.location.hash.slice("#sheet-field-".length)
        : "");
    if (!key) return;
    const node = document.getElementById(sheetFieldDomId(key)) ?? document.getElementById(key);
    if (!node) return;
    const details = node.closest("details");
    if (details && !details.open) details.open = true;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("ring-2", "ring-[var(--ff-terracotta)]", "ring-offset-2");
    const timer = window.setTimeout(() => {
      node.classList.remove("ring-2", "ring-[var(--ff-terracotta)]", "ring-offset-2");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [field]);
  return null;
}
