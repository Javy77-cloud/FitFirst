/** Sitewide selection chip tabs — match Deal Details/Documents/Markets/Quotes. */

import { cn } from "@/lib/utils";

/** Gap between chips in a row. */
export const FF_CHIP_TAB_GROUP = "inline-flex flex-wrap items-center gap-1.5";

const BASE =
  "ff-chip-tab rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors";

const ON =
  "bg-primary text-primary-foreground border-primary";

const OFF =
  "bg-white text-gray-600 border-gray-400 hover:bg-gray-50";

export function chipTabClass(selected: boolean, extra?: string) {
  return cn(BASE, selected ? ON : OFF, extra);
}
