import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import type { PropertyFillSourceId } from "./types";
import {
  COUNTY_PA_LABEL,
  FEMA_LABEL,
  FLOODZONEMAP_LABEL,
  PROPERTY_RECORDS_LABEL,
} from "./types";

/**
 * Merge order (locked 2026-09-10):
 * GetParcel → County PA → FloodZoneMap (wins on conflicts) → FEMA empty-only
 * (FEMA must NEVER overwrite FloodZoneMap — or any earlier key).
 */
export function mergePropertyFillFacts(parts: {
  getParcel?: PropertyRecordsFact[];
  countyPa?: PropertyRecordsFact[];
  floodZoneMap?: PropertyRecordsFact[];
  fema?: PropertyRecordsFact[];
}): { facts: PropertyRecordsFact[]; sourcesUsed: PropertyFillSourceId[] } {
  const byKey = new Map<string, PropertyRecordsFact>();
  const sourcesUsed: PropertyFillSourceId[] = [];

  const applyOverwrite = (list: PropertyRecordsFact[] | undefined, source: PropertyFillSourceId) => {
    if (!list?.length) return;
    sourcesUsed.push(source);
    for (const fact of list) {
      if (!fact.sheetKey || fact.sheetKey === "coverage_a") continue;
      byKey.set(fact.sheetKey, fact);
    }
  };

  const applyEmptyOnly = (list: PropertyRecordsFact[] | undefined, source: PropertyFillSourceId) => {
    if (!list?.length) return;
    let used = false;
    for (const fact of list) {
      if (!fact.sheetKey || fact.sheetKey === "coverage_a") continue;
      if (byKey.has(fact.sheetKey)) continue;
      byKey.set(fact.sheetKey, fact);
      used = true;
    }
    if (used) sourcesUsed.push(source);
  };

  applyOverwrite(parts.getParcel, "property-records");
  applyOverwrite(parts.countyPa, "county-pa");
  applyOverwrite(parts.floodZoneMap, "floodzonemap");
  applyEmptyOnly(parts.fema, "fema");

  return { facts: [...byKey.values()], sourcesUsed };
}

export function toastForPropertyFill(args: {
  filledCount: number;
  sourcesUsed: PropertyFillSourceId[];
  vintage?: string;
  /** When FloodZoneMap (or FEMA) returns zone X with no BFE. */
  zoneXNoBfe?: boolean;
}): string {
  if (!args.filledCount) {
    if (args.zoneXNoBfe) {
      return "Zone X — no BFE";
    }
    return args.sourcesUsed.length
      ? "Property records matched, but no blank fields to fill."
      : "No parcel matched that address.";
  }
  const labels = args.sourcesUsed.map((id) => {
    if (id === "property-records") return PROPERTY_RECORDS_LABEL;
    if (id === "county-pa") return COUNTY_PA_LABEL;
    if (id === "floodzonemap") return FLOODZONEMAP_LABEL;
    return FEMA_LABEL;
  });
  const unique = [...new Set(labels)];
  const src = unique.join(" + ");
  let base = `Wrote ${args.filledCount} from ${src}`;
  if (args.zoneXNoBfe) {
    const withNote = `${base} · Zone X — no BFE`;
    if (withNote.length <= 80) base = withNote;
  }
  if (args.vintage) {
    const withVintage = `${base}; vintage ${args.vintage}`;
    return withVintage.length <= 80 ? withVintage : base.slice(0, 80);
  }
  return base.length <= 80 ? base : base.slice(0, 80);
}

/** Zone X often has no BFE — detect from merged flood facts for toast. */
export function isZoneXNoBfe(facts: PropertyRecordsFact[]): boolean {
  const zone = facts.find((f) => f.sheetKey === "flood_zone")?.value?.trim().toUpperCase();
  if (zone !== "X" && zone !== "ZONE X") return false;
  const bfe = facts.find((f) => f.sheetKey === "bfe")?.value?.trim();
  return !bfe;
}
