import { DEFAULT_SECTION_DENSITY, type CustomFieldType } from "./types";

export type LayoutFieldKind = "compact" | "wide" | "standard";

export type SectionFieldRow = {
  keys: string[];
  kind: LayoutFieldKind;
};

export type LayoutFieldHint = {
  type?: CustomFieldType | string;
  options?: readonly string[] | null;
  systemKey?: string | null;
};

const YES_NO = new Set(["yes", "no"]);

export type SectionColumnCount = 1 | 2 | 3 | 4 | 5;

/**
 * Standard Tailwind column utilities — always in the default set, never purged.
 * Arbitrary `repeat(N,minmax(0,1fr))` classes are not the source of truth:
 * Tailwind v4 can drop or collide them, which made Columns 4 paint as 3.
 */
const SECTION_GRID_COL_CLASS: Record<SectionColumnCount, string> = {
  1: "grid grid-cols-1 gap-x-3 gap-y-2",
  2: "grid grid-cols-2 gap-x-3 gap-y-2",
  3: "grid grid-cols-3 gap-x-3 gap-y-2",
  4: "grid grid-cols-4 gap-x-3 gap-y-2",
  5: "grid grid-cols-5 gap-x-3 gap-y-2",
};

const COMPACT_ROW_COL_CLASS: Record<SectionColumnCount, string> = {
  1: "grid grid-cols-1 gap-x-3 gap-y-2",
  2: "grid grid-cols-2 gap-x-3 gap-y-2",
  3: "grid grid-cols-3 gap-x-3 gap-y-2 max-[699px]:grid-cols-2",
  4: "grid grid-cols-4 gap-x-3 gap-y-2 max-[699px]:grid-cols-2",
  5: "grid grid-cols-5 gap-x-3 gap-y-2 max-[699px]:grid-cols-2",
};

export function clampSectionColumns(density: number): SectionColumnCount {
  if (!Number.isFinite(density)) return 2;
  return Math.min(5, Math.max(1, Math.round(density))) as SectionColumnCount;
}

/** Winning column template. Inline this so stylesheets cannot leave 4 stuck at 3. */
export function sectionGridTemplate(density: number): string {
  const cols = clampSectionColumns(density);
  return cols === 1 ? "minmax(0, 1fr)" : `repeat(${cols}, minmax(0, 1fr))`;
}

export function sectionFieldGridClass(
  density: number,
  opts?: { collapse?: boolean },
): string {
  const cols = clampSectionColumns(density);
  const collapse = opts?.collapse === false || cols === 1 ? "" : " max-[699px]:grid-cols-1";
  return `${SECTION_GRID_COL_CLASS[cols]}${collapse}`;
}

export function sectionFieldGridVars(density: number): {
  "--ff-section-cols": string;
  gridTemplateColumns: string;
} {
  const cols = clampSectionColumns(density);
  return {
    "--ff-section-cols": String(cols),
    gridTemplateColumns: sectionGridTemplate(cols),
  };
}

export function compactRowClass(count: number): string {
  return COMPACT_ROW_COL_CLASS[clampSectionColumns(count)];
}

export function compactRowVars(count: number): {
  "--ff-compact-cols": string;
  gridTemplateColumns: string;
} {
  const cols = clampSectionColumns(count);
  return {
    "--ff-compact-cols": String(cols),
    gridTemplateColumns: sectionGridTemplate(cols),
  };
}

/** Inline style wins. Used by tests so "Columns 4" cannot silently mean 3. */
export function readRenderedColumnCount(html: string): number {
  const inline = html.match(/grid-template-columns:\s*repeat\((\d+)/i);
  if (inline) return Number(inline[1]);
  const single = html.match(/grid-template-columns:\s*minmax\(0,\s*1fr\)/i);
  if (single) return 1;
  const data = html.match(/data-ff-section-density="(\d+)"/);
  if (data) return Number(data[1]);
  const cls = html.match(/\bgrid-cols-([1-5])\b/);
  if (cls) return Number(cls[1]);
  throw new Error("Could not read rendered column count");
}

export function isCityFieldKey(key: string): boolean {
  return /(^|_)city$/.test(key.toLowerCase());
}

export function isStateFieldKey(key: string): boolean {
  return /(^|_)state$/.test(key.toLowerCase());
}

export function isZipFieldKey(key: string): boolean {
  return /(^|_)zip$/.test(key.toLowerCase());
}

export function isCountyFieldKey(key: string): boolean {
  return /(^|_)county$/.test(key.toLowerCase());
}

/** Street line that can sit with city/state/zip/county at 4–5 density. */
export function isStreetAddressFieldKey(key: string): boolean {
  const k = key.toLowerCase();
  if (k.includes("mailing") || k.includes("legal") || k.includes("email") || k.includes("website")) {
    return false;
  }
  return (
    k === "address1" ||
    k === "address" ||
    /(^|_)(address1|street|garaging_address)$/.test(k)
  );
}

export function isCompactLayoutField(key: string, field?: LayoutFieldHint): boolean {
  const k = key.toLowerCase();
  if (/(^|_)(city|state|zip|county|unit)$/.test(k)) return true;
  if (/(^|_)(date_of_birth|dob|gender|marital_status|marital)$/.test(k)) return true;
  if (
    /(^|_)(year|stories|beds|baths|acres|units|footage)$/.test(k) ||
    /_year$/.test(k) ||
    /^year_/.test(k) ||
    /square_feet/.test(k)
  ) {
    return true;
  }
  if (field?.type === "dob" || field?.type === "checkbox") return true;
  const opts = (field?.options ?? []).map((option) => option.trim().toLowerCase()).filter(Boolean);
  if (field?.type === "picklist" && opts.length > 0 && opts.every((option) => YES_NO.has(option))) {
    return true;
  }
  return false;
}

export function isWideLayoutField(key: string, field?: LayoutFieldHint): boolean {
  if (field?.type === "multi_line" || field?.type === "address" || field?.type === "image" || field?.type === "formula") {
    return true;
  }
  const k = key.toLowerCase();
  if (k === "insurance_type" || k === "pipeline" || field?.systemKey === "quotingForm") return true;
  if (k === "existing_coverage_types" || k === "cross_selling_opportunity") return true;
  if (k === "email" || k.endsWith("_email") || k === "website" || k.endsWith("_website")) {
    return true;
  }
  return false;
}

export function layoutFieldKind(key: string, field?: LayoutFieldHint): LayoutFieldKind {
  if (isWideLayoutField(key, field)) return "wide";
  if (isCompactLayoutField(key, field)) return "compact";
  return "standard";
}

function cityStateZipRun(keys: string[], start: number): string[] | null {
  const city = keys[start];
  const state = keys[start + 1];
  const zip = keys[start + 2];
  if (!city || !state || !zip) return null;
  if (isCityFieldKey(city) && isStateFieldKey(state) && isZipFieldKey(zip)) {
    return [city, state, zip];
  }
  return null;
}

function isAddressPartKey(key: string): boolean {
  return (
    isCityFieldKey(key) ||
    isStateFieldKey(key) ||
    isZipFieldKey(key) ||
    isCountyFieldKey(key)
  );
}

/** Property address + city + state + zip + county on one row at 4–5 density. */
export function propertyAddressRun(
  keys: string[],
  start: number,
  density: number,
): string[] | null {
  if (density < 4) return null;
  const first = keys[start];
  if (!first || !isStreetAddressFieldKey(first)) return null;
  const rest: string[] = [];
  let i = start + 1;
  while (i < keys.length && rest.length < density - 1) {
    const next = keys[i]!;
    if (!isAddressPartKey(next)) break;
    rest.push(next);
    i += 1;
  }
  if (rest.length < 3) return null;
  return [first, ...rest];
}

function kindAtDensity(
  key: string,
  field: LayoutFieldHint | undefined,
  density: number,
): LayoutFieldKind {
  const kind = layoutFieldKind(key, field);
  if (density >= 4 && kind === "wide" && isStreetAddressFieldKey(key)) return "standard";
  return kind;
}

export function groupSectionFieldRows(
  keys: readonly string[],
  fieldOf?: (key: string) => LayoutFieldHint | undefined,
  density: number = DEFAULT_SECTION_DENSITY,
): SectionFieldRow[] {
  const pack = clampSectionColumns(density);
  const list = keys.filter((key) => key);
  const rows: SectionFieldRow[] = [];
  let i = 0;
  while (i < list.length) {
    const key = list[i]!;
    const field = fieldOf?.(key);
    const addressRow = propertyAddressRun(list, i, pack);
    if (addressRow) {
      rows.push({ keys: addressRow, kind: "compact" });
      i += addressRow.length;
      continue;
    }
    const kind = kindAtDensity(key, field, pack);
    if (kind === "wide") {
      rows.push({ keys: [key], kind: "wide" });
      i += 1;
      continue;
    }
    if (pack < 4) {
      const trio = cityStateZipRun(list, i);
      if (trio) {
        rows.push({ keys: trio, kind: "compact" });
        i += 3;
        continue;
      }
    }
    if (kind === "compact") {
      const chunk = [key];
      while (chunk.length < pack && i + chunk.length < list.length) {
        const nextKey = list[i + chunk.length]!;
        if (pack < 4 && cityStateZipRun(list, i + chunk.length)) break;
        if (kindAtDensity(nextKey, fieldOf?.(nextKey), pack) !== "compact") break;
        chunk.push(nextKey);
      }
      if (chunk.length >= 2) {
        rows.push({ keys: chunk, kind: "compact" });
        i += chunk.length;
        continue;
      }
    }
    rows.push({ keys: [key], kind: kind === "compact" ? "compact" : "standard" });
    i += 1;
  }
  return rows;
}
