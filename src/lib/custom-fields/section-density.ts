import {
  DEFAULT_SECTION_DENSITY,
  type CustomFieldType,
  type SectionDensity,
} from "./types";

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

export function sectionFieldGridClass(
  density: SectionDensity,
  opts?: { collapse?: boolean },
): string {
  const collapse = opts?.collapse === false ? "" : " max-[699px]:grid-cols-1";
  if (density === 1) return "grid grid-cols-1 gap-x-3 gap-y-2";
  if (density === 3) return `grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 gap-y-2${collapse}`;
  return `grid grid-cols-2 gap-x-3 gap-y-2${collapse}`;
}

export function compactRowClass(count: number): string {
  if (count >= 3) return "grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 gap-y-2 max-[699px]:grid-cols-2";
  if (count === 2) return "grid grid-cols-2 gap-x-3 gap-y-2";
  return "grid grid-cols-1 gap-x-3 gap-y-2";
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

export function isCompactLayoutField(key: string, field?: LayoutFieldHint): boolean {
  const k = key.toLowerCase();
  if (/(^|_)(city|state|zip|county|unit)$/.test(k)) return true;
  if (/(^|_)(date_of_birth|dob|gender|marital_status|marital)$/.test(k)) return true;
  if (/(^|_)(year|stories|beds|baths|acres)$/.test(k) || /_year$/.test(k) || /^year_/.test(k)) {
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

export function groupSectionFieldRows(
  keys: readonly string[],
  fieldOf?: (key: string) => LayoutFieldHint | undefined,
  _density: SectionDensity = DEFAULT_SECTION_DENSITY,
): SectionFieldRow[] {
  void _density;
  const list = keys.filter((key) => key);
  const rows: SectionFieldRow[] = [];
  let i = 0;
  while (i < list.length) {
    const key = list[i]!;
    const field = fieldOf?.(key);
    const kind = layoutFieldKind(key, field);
    if (kind === "wide") {
      rows.push({ keys: [key], kind: "wide" });
      i += 1;
      continue;
    }
    const trio = cityStateZipRun(list, i);
    if (trio) {
      rows.push({ keys: trio, kind: "compact" });
      i += 3;
      continue;
    }
    if (kind === "compact") {
      const chunk = [key];
      while (chunk.length < 3 && i + chunk.length < list.length) {
        const nextKey = list[i + chunk.length]!;
        if (cityStateZipRun(list, i + chunk.length)) break;
        if (layoutFieldKind(nextKey, fieldOf?.(nextKey)) !== "compact") break;
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
