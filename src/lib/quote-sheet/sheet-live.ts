import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  normalizeOpeningProtection,
  normalizeRoofCovering,
  normalizeRoofDeckAttachment,
} from "@/lib/quote-sheet/sheet-defaults";

export function sheetValuesToLive(
  values: Record<string, QuoteSheetFieldValue | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, cell]) => [key, cell?.value ?? ""]),
  );
}

/**
 * Blank live state must not hide a filled server cell.
 * `??` treats "" as a real value, so a control mounted empty stays empty after Fill.
 */
export function sheetDisplayValue(
  live: string | null | undefined,
  stored: string | null | undefined,
): string {
  if (typeof live === "string" && live.trim()) return live;
  if (typeof stored === "string" && stored.trim()) return stored;
  return "";
}

const PICKLIST_NORMALIZERS: Record<string, (raw: string) => string> = {
  roof_covering: (raw) => normalizeRoofCovering(raw),
  roof_deck: (raw) => normalizeRoofDeckAttachment(raw),
  roof_deck_attachment: (raw) => normalizeRoofDeckAttachment(raw),
  opening_protection: (raw) => normalizeOpeningProtection(raw),
};

/** Control value: non-empty live wins, otherwise the stored cell, then picklist letters map onto options. */
export function sheetControlValue(
  fieldKey: string,
  live: string | null | undefined,
  stored: string | null | undefined,
): string {
  const raw = sheetDisplayValue(live, stored);
  const normalize = PICKLIST_NORMALIZERS[fieldKey];
  return normalize ? normalize(raw) : raw;
}

export function sheetValuesFingerprint(
  values: Record<string, QuoteSheetFieldValue | undefined>,
): string {
  return Object.keys(values)
    .sort()
    .map((key) => `${key}=${values[key]?.value ?? ""}\u0000${values[key]?.status ?? ""}`)
    .join("\n");
}

/**
 * After Fill, server cells arrive while live state is still the blank mount snapshot.
 * Adopt the new server value when live still matches the previous server snapshot,
 * or when live is blank. A value the user typed over stays.
 */
export function mergeLiveWithServerValues(
  prevLive: Record<string, string>,
  prevServer: Record<string, string>,
  nextServer: Record<string, string>,
): Record<string, string> {
  const keys = new Set([
    ...Object.keys(prevLive),
    ...Object.keys(prevServer),
    ...Object.keys(nextServer),
  ]);
  let changed = false;
  const next: Record<string, string> = { ...prevLive };
  for (const key of keys) {
    const live = prevLive[key] ?? "";
    const before = prevServer[key] ?? "";
    const incoming = nextServer[key] ?? "";
    if (live === before || !live.trim()) {
      const adopted = incoming.trim() ? incoming : live;
      if (adopted !== live) {
        next[key] = adopted;
        changed = true;
      }
    }
  }
  return changed ? next : prevLive;
}
