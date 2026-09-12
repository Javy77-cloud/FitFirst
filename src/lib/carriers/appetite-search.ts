/**
 * Agency-friendly Appetite + Don't Write search across carriers.
 * Search e.g. "flood" → who writes / who excludes.
 */

import {
  appetiteSearchBlob,
  type AppetiteNoteRow,
  type DontWriteNoteRow,
} from "@/lib/carriers/appetite-rows";

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
  appetiteRows?: AppetiteNoteRow[] | null,
  dontWriteRows?: DontWriteNoteRow[] | null,
): AppetiteSearchHit {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { side: "none", writesSnippet: null, excludesSnippet: null };
  }
  const blob = appetiteSearchBlob({
    appetiteNotes,
    dontWriteNotes,
    appetiteRows,
    dontWriteRows,
  });
  const writes = blob.writes.toLowerCase().includes(needle);
  const excludes = blob.excludes.toLowerCase().includes(needle);
  let side: AppetiteMatchSide = "none";
  if (writes && excludes) side = "both";
  else if (writes) side = "writes";
  else if (excludes) side = "excludes";
  return {
    side,
    writesSnippet: writes ? snippetAround(blob.writes, needle) : null,
    excludesSnippet: excludes ? snippetAround(blob.excludes, needle) : null,
  };
}

export function carrierListHaystack(parts: {
  name?: string | null;
  agencyCode?: string | null;
  writtenLines?: string[] | null;
  tags?: string[] | null;
  appetiteNotes?: string | null;
  dontWriteNotes?: string | null;
  appetiteRows?: AppetiteNoteRow[] | null;
  dontWriteRows?: DontWriteNoteRow[] | null;
  autoLabel?: string | null;
}): string {
  const blob = appetiteSearchBlob({
    appetiteNotes: parts.appetiteNotes,
    dontWriteNotes: parts.dontWriteNotes,
    appetiteRows: parts.appetiteRows,
    dontWriteRows: parts.dontWriteRows,
  });
  return [
    parts.name,
    parts.agencyCode,
    parts.autoLabel,
    ...(parts.writtenLines ?? []),
    ...(parts.tags ?? []),
    blob.writes,
    blob.excludes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
