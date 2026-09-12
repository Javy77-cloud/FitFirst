/**
 * Agency-friendly Appetite + Don't Write search across carriers.
 * Search e.g. "flood" → who writes / who excludes.
 */

export type AppetiteMatchSide = "writes" | "excludes" | "both" | "none";

export type AppetiteSearchHit = {
  side: AppetiteMatchSide;
  writesSnippet: string | null;
  excludesSnippet: string | null;
};

function snippetAround(hay: string, needle: string, radius = 48): string | null {
  const lower = hay.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(hay.length, idx + needle.length + radius);
  let out = hay.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) out = "…" + out;
  if (end < hay.length) out = out + "…";
  return out;
}

export function matchAppetiteSearch(
  query: string,
  appetiteNotes: string | null | undefined,
  dontWriteNotes: string | null | undefined,
): AppetiteSearchHit {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { side: "none", writesSnippet: null, excludesSnippet: null };
  }
  const appetite = (appetiteNotes ?? "").trim();
  const dont = (dontWriteNotes ?? "").trim();
  const writes = appetite.toLowerCase().includes(needle);
  const excludes = dont.toLowerCase().includes(needle);
  let side: AppetiteMatchSide = "none";
  if (writes && excludes) side = "both";
  else if (writes) side = "writes";
  else if (excludes) side = "excludes";
  return {
    side,
    writesSnippet: writes ? snippetAround(appetite, needle) : null,
    excludesSnippet: excludes ? snippetAround(dont, needle) : null,
  };
}

export function carrierListHaystack(parts: {
  name?: string | null;
  agencyCode?: string | null;
  writtenLines?: string[] | null;
  tags?: string[] | null;
  appetiteNotes?: string | null;
  dontWriteNotes?: string | null;
}): string {
  return [
    parts.name,
    parts.agencyCode,
    ...(parts.writtenLines ?? []),
    ...(parts.tags ?? []),
    parts.appetiteNotes,
    parts.dontWriteNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
