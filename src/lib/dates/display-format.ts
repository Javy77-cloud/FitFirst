/** Sitewide display date formats. Storage stays ISO `YYYY-MM-DD`. */

export const DATE_DISPLAY_FORMATS = ["mdy", "ymd", "dmy"] as const;
export type DateDisplayFormat = (typeof DATE_DISPLAY_FORMATS)[number];

export const DEFAULT_DATE_DISPLAY_FORMAT: DateDisplayFormat = "mdy";

export const DATE_DISPLAY_FORMAT_LABELS: Record<DateDisplayFormat, string> = {
  mdy: "M-D-Y (5-15-1990)",
  ymd: "Y-M-D (1990-5-15)",
  dmy: "D-M-Y (15-5-1990)",
};

export function isDateDisplayFormat(value: unknown): value is DateDisplayFormat {
  return value === "mdy" || value === "ymd" || value === "dmy";
}

export function normalizeDateDisplayFormat(
  value: string | null | undefined,
): DateDisplayFormat {
  return isDateDisplayFormat(value) ? value : DEFAULT_DATE_DISPLAY_FORMAT;
}

function partsFromValue(value: Date | string): { y: number; m: number; d: number } | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
    }
    const mdy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (mdy) {
      return { y: Number(mdy[3]), m: Number(mdy[1]), d: Number(mdy[2]) };
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return null;
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  if (Number.isNaN(value.getTime())) return null;
  // Date-only intent: use UTC parts when time is midnight UTC to avoid TZ day-shift.
  if (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    return {
      y: value.getUTCFullYear(),
      m: value.getUTCMonth() + 1,
      d: value.getUTCDate(),
    };
  }
  return {
    y: value.getFullYear(),
    m: value.getMonth() + 1,
    d: value.getDate(),
  };
}

/** Format a calendar date for desk UI. Default FitFirst: M-D-Y. */
export function formatDisplayDate(
  value: Date | string | null | undefined,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  if (value == null || value === "") return "—";
  const parts = partsFromValue(value instanceof Date || typeof value === "string" ? value : String(value));
  if (!parts) return "—";
  const m = String(parts.m);
  const d = String(parts.d);
  const y = String(parts.y);
  if (format === "ymd") return `${y}-${m}-${d}`;
  if (format === "dmy") return `${d}-${m}-${y}`;
  return `${m}-${d}-${y}`;
}
