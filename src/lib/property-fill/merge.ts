import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import type { PropertyFillSourceId } from "./types";
import { COUNTY_PA_LABEL, FEMA_LABEL, PROPERTY_RECORDS_LABEL } from "./types";

/**
 * Later sources win per sheetKey.
 * Order: GetParcel → County PA → FEMA (FEMA preferred for flood_zone / FIRM / BFE).
 */
export function mergePropertyFillFacts(parts: {
  getParcel?: PropertyRecordsFact[];
  countyPa?: PropertyRecordsFact[];
  fema?: PropertyRecordsFact[];
}): { facts: PropertyRecordsFact[]; sourcesUsed: PropertyFillSourceId[] } {
  const byKey = new Map<string, PropertyRecordsFact>();
  const sourcesUsed: PropertyFillSourceId[] = [];

  const apply = (list: PropertyRecordsFact[] | undefined, source: PropertyFillSourceId) => {
    if (!list?.length) return;
    sourcesUsed.push(source);
    for (const fact of list) {
      if (!fact.sheetKey || fact.sheetKey === "coverage_a") continue;
      byKey.set(fact.sheetKey, fact);
    }
  };

  apply(parts.getParcel, "property-records");
  apply(parts.countyPa, "county-pa");
  apply(parts.fema, "fema");

  return { facts: [...byKey.values()], sourcesUsed };
}

export function toastForPropertyFill(args: {
  filledCount: number;
  sourcesUsed: PropertyFillSourceId[];
  vintage?: string;
}): string {
  if (!args.filledCount) {
    return args.sourcesUsed.length
      ? "Property records matched, but no blank fields to fill."
      : "No parcel matched that address.";
  }
  const labels = args.sourcesUsed.map((id) => {
    if (id === "property-records") return PROPERTY_RECORDS_LABEL;
    if (id === "county-pa") return COUNTY_PA_LABEL;
    return FEMA_LABEL;
  });
  const unique = [...new Set(labels)];
  const src = unique.join(" + ");
  const base = `Wrote ${args.filledCount} from ${src}`;
  if (args.vintage) {
    const withVintage = `${base}; vintage ${args.vintage}`;
    return withVintage.length <= 80 ? withVintage : base.slice(0, 80);
  }
  return base.length <= 80 ? base : base.slice(0, 80);
}
