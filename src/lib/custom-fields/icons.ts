import type { PaletteItem } from "./types";

/** Shared Lucide icon names — same set on palette, canvas, and Settings. */
export const FIELD_TYPE_ICON_NAMES = {
  single_line: "Type",
  multi_line: "AlignLeft",
  email: "Mail",
  phone: "Phone",
  address: "MapPin",
  picklist: "List",
  multi_select: "ListChecks",
  date: "Calendar",
  date_time: "CalendarClock",
  number: "Hash",
  currency: "DollarSign",
  percentage: "Percent",
  checkbox: "SquareCheck",
  lookup: "Link",
  formula: "Sigma",
  image: "Image",
  section: "Rows3",
} as const satisfies Record<PaletteItem, string>;

export function iconNameForType(type: PaletteItem): string {
  return FIELD_TYPE_ICON_NAMES[type];
}
