import { sourceLabel } from "@/lib/crm/sources";

export type SourceShare = {
  label: string;
  count: number;
  share: number;
};

export type LeadSourceGlance = {
  total: number;
  leader: SourceShare | null;
  top: SourceShare[];
};

/** Top few named sources. Blank sources stay in the total and never become a row. */
export function leadSourceGlance(
  sources: Array<string | null | undefined>,
  limit = 3,
): LeadSourceGlance {
  const counts = new Map<string, number>();
  let total = 0;
  for (const raw of sources) {
    total += 1;
    const label = sourceLabel(raw);
    if (!label || label === "—") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked.slice(0, Math.max(1, limit)).map(([label, count]) => ({
    label,
    count,
    share: total === 0 ? 0 : Math.round((count / total) * 100),
  }));
  return { total, leader: top[0] ?? null, top };
}
