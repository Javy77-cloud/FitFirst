/**
 * Line matching for appetite v1.
 * Snapshot line (HO3|HO6|DP1|…) vs pipe-split lines_offered / lines_not_offered.
 */

const FAMILY: Record<string, string[]> = {
  HO: ["HO", "HO3", "HO4", "HO5", "HO6", "HO8", "MH", "HO_MP"],
  HO3: ["HO3"],
  HO4: ["HO4"],
  HO5: ["HO5"],
  HO6: ["HO6"],
  HO_MP: ["HO_MP", "HO"],
  DP: ["DP", "DP1", "DP3", "DP_RENTAL"],
  DP1: ["DP1", "DP"],
  DP3: ["DP3", "DP"],
  DP_RENTAL: ["DP_RENTAL", "DP"],
  MOBILE: ["MOBILE"],
  MANUFACTURED: ["MANUFACTURED"],
  VACANT: ["VACANT"],
  PAP: ["PAP", "NONSTANDARD_PAP", "STANDARD_PAP"],
  NONSTANDARD_PAP: ["NONSTANDARD_PAP"],
  STANDARD_PAP: ["STANDARD_PAP"],
  COLLECTOR_AUTO: ["COLLECTOR_AUTO", "CLASSIC_AUTO"],
  CLASSIC_AUTO: ["CLASSIC_AUTO", "COLLECTOR_AUTO"],
};

export function normalizeLine(line: string): string {
  return line.trim().toUpperCase().replace(/\s+/g, "_");
}

function familyOf(line: string): string[] {
  const key = normalizeLine(line);
  return FAMILY[key] ?? [key];
}

export function lineMatchesOffered(snapshotLine: string, offered: string[]): boolean {
  if (offered.length === 0) return true;
  const snap = normalizeLine(snapshotLine);
  const snapFam = new Set(familyOf(snap));
  for (const item of offered) {
    const o = normalizeLine(item);
    if (o === snap) return true;
    if (snapFam.has(o)) return true;
    const offeredFam = familyOf(o);
    if (offeredFam.includes(snap)) return true;
  }
  return false;
}

/** Occupancy-shaped offered lines (Foremost MOBILE|MANUFACTURED|VACANT). */
export function occupancyLineMatch(
  offered: string[],
  flags: { isMobile: boolean; isManufactured: boolean; isVacant: boolean },
): boolean {
  const set = new Set(offered.map(normalizeLine));
  if (flags.isMobile && set.has("MOBILE")) return true;
  if (flags.isManufactured && set.has("MANUFACTURED")) return true;
  if (flags.isVacant && set.has("VACANT")) return true;
  return false;
}

export function splitPipeList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}
