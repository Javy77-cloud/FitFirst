/**
 * Punchy series colors for Home charts. Stay on the blue/orange desk —
 * not a dark InsuredMine rail. Saturated, not washed navy/gray.
 */
export const CHART_SERIES_COLORS = [
  "#1d8cff",
  "#f26522",
  "#12b886",
  "#ffb020",
  "#2563eb",
  "#e11d74",
  "#0ea5a4",
  "#fb7185",
] as const;

export function chartColor(index: number): string {
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
}
