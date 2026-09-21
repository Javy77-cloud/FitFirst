import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { PERSONAL_DRIVER_CAP } from "@/lib/quote-sheet/repeatable-units";

/**
 * Auto driver identity fields. Vehicle count is not an input: a household can
 * have four cars and two drivers, and Fill must not open extra driver rows to
 * match the vehicle list.
 */
export const AUTO_DRIVER_PARTS = [
  "name",
  "dob",
  "gender",
  "industry",
  "occupation",
  "education_level",
  "marital_status",
  "license",
  "status",
  "years_licensed",
  "household_status",
  "exclude_reason",
  "age_first_licensed",
  "suspension_5yr",
  "relationship",
] as const;

export type AutoDriverPart = (typeof AUTO_DRIVER_PARTS)[number];

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const DRIVER_KEY = /^driver_(\d+)_([a-z0-9_]+)$/;

export function normalizeAutoDriverName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pivotYear(year: string): string {
  if (year.length !== 2) return year;
  const yy = Number(year);
  if (!Number.isFinite(yy)) return year;
  return String(yy >= 30 ? 1900 + yy : 2000 + yy);
}

/** 04/22/1959, 4/22/59, and April 22, 1959 share one key. Unparsed text stays distinct. */
export function normalizeAutoDriverDob(raw: string): string {
  const text = raw.trim();
  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (numeric) {
    return `${pivotYear(numeric[3])}-${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}`;
  }
  const named = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (month) return `${named[3]}-${month}-${named[2].padStart(2, "0")}`;
  }
  return text.toLowerCase().replace(/\s+/g, "");
}

/**
 * Same listed person: normalized name and the same date of birth.
 * A missing date does not count as a match. Different dates stay apart (father / son).
 */
export function autoDriversSamePerson(
  aName: string,
  aDob: string,
  bName: string,
  bDob: string,
): boolean {
  const nameA = normalizeAutoDriverName(aName);
  const nameB = normalizeAutoDriverName(bName);
  if (!nameA || nameA !== nameB) return false;
  const dobA = normalizeAutoDriverDob(aDob);
  const dobB = normalizeAutoDriverDob(bDob);
  if (!dobA || !dobB) return false;
  return dobA === dobB;
}

function filledPartCount<T>(
  slot: Record<string, T | undefined>,
  textOf: (value: T | undefined) => string,
): number {
  return AUTO_DRIVER_PARTS.filter((part) => textOf(slot[part]).trim()).length;
}

/** Keep the row with more filled fields. Fill any still-blank parts from the other row. Longer legal name wins. */
function mergeDriverRecords<T>(
  keep: Record<string, T | undefined>,
  extra: Record<string, T | undefined>,
  textOf: (value: T | undefined) => string,
) {
  const base = filledPartCount(extra, textOf) > filledPartCount(keep, textOf) ? extra : keep;
  const fill = base === extra ? keep : extra;
  for (const part of AUTO_DRIVER_PARTS) {
    if (part === "name") {
      const baseName = textOf(base.name).trim();
      const fillName = textOf(fill.name).trim();
      keep.name = fillName.length > baseName.length ? fill.name : base.name;
      continue;
    }
    if (textOf(base[part]).trim()) keep[part] = base[part];
    else if (textOf(fill[part]).trim()) keep[part] = fill[part];
    else delete keep[part];
  }
}

export function collapseDriverRecords<T>(
  slots: Array<Record<string, T | undefined>>,
  textOf: (value: T | undefined) => string,
): Array<Record<string, T | undefined>> {
  const kept: Array<Record<string, T | undefined>> = [];
  for (const slot of slots) {
    const name = textOf(slot.name);
    if (!name.trim()) continue;
    const match = kept.find((row) =>
      autoDriversSamePerson(textOf(row.name), textOf(row.dob), name, textOf(slot.dob)),
    );
    if (!match) {
      kept.push({ ...slot });
      continue;
    }
    mergeDriverRecords(match, slot, textOf);
  }
  return kept;
}

function printableDriverCell(cell?: { value?: string; status?: string } | null): string {
  if (!cell || cell.status === "missing") return "";
  return (cell.value ?? "").trim();
}

function sheetSlots(
  values: Record<string, QuoteSheetFieldValue | undefined>,
): Array<Record<string, QuoteSheetFieldValue | undefined>> {
  const slots: Array<Record<string, QuoteSheetFieldValue | undefined>> = [];
  for (let index = 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
    const slot: Record<string, QuoteSheetFieldValue | undefined> = {};
    for (const part of AUTO_DRIVER_PARTS) {
      const cell = values[`driver_${index}_${part}`];
      if (printableDriverCell(cell)) slot[part] = cell;
    }
    slots.push(slot);
  }
  return slots;
}

/**
 * Collapse same name + DOB already stored on the Auto sheet.
 * Does not read vehicle keys and does not open a driver row per vehicle.
 */
export function collapseAutoDriverSheet(
  values: Record<string, QuoteSheetFieldValue>,
): Record<string, QuoteSheetFieldValue> {
  const collapsed = collapseDriverRecords(sheetSlots(values), (cell) => cell?.value ?? "");
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  for (let index = 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
    const snap = collapsed[index - 1];
    for (const part of AUTO_DRIVER_PARTS) {
      const key = `driver_${index}_${part}`;
      if (index === 1 && part === "relationship") {
        if (next[key]?.value?.trim()) {
          next[key] = { value: "", status: "missing", source: "blank" };
        }
        continue;
      }
      const cell = snap?.[part];
      const text = cell?.value?.trim() ?? "";
      if (!text) {
        if (next[key]?.value?.trim()) {
          next[key] = { value: "", status: "missing", source: "blank" };
        }
        continue;
      }
      next[key] = cell ?? next[key];
    }
  }
  return next;
}

type DriverField = { fieldKey: string; normalizedValue: string };

/**
 * Point this photo's driver fields at the sheet row for that person.
 * A later JPEG that numbers James as driver 3 merges into the James row
 * already on the profile instead of opening driver 3.
 */
export function retargetAutoDriverFields<T extends DriverField>(
  existing: Record<string, { value?: string; status?: string } | undefined>,
  extracted: T[],
): T[] {
  const rest: T[] = [];
  const incoming: Array<Record<string, T | undefined>> = Array.from(
    { length: PERSONAL_DRIVER_CAP },
    () => ({}),
  );
  let sawDriver = false;
  for (const item of extracted) {
    const match = DRIVER_KEY.exec(item.fieldKey);
    if (!match) {
      rest.push(item);
      continue;
    }
    const index = Number(match[1]);
    const part = match[2];
    if (index < 1 || index > PERSONAL_DRIVER_CAP || !AUTO_DRIVER_PARTS.includes(part as AutoDriverPart)) {
      rest.push(item);
      continue;
    }
    sawDriver = true;
    if (!item.normalizedValue.trim()) continue;
    incoming[index - 1][part] = item;
  }
  if (!sawDriver) return extracted;

  const collapsed = collapseDriverRecords(incoming, (item) => item?.normalizedValue ?? "");
  const taken = new Set<number>();
  const placed: T[] = [];
  for (const person of collapsed) {
    const name = person.name?.normalizedValue ?? "";
    const dob = person.dob?.normalizedValue ?? "";
    if (!name.trim()) continue;
    let dest = 0;
    for (let index = 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
      const currentName = printableDriverCell(existing[`driver_${index}_name`]);
      const currentDob = printableDriverCell(existing[`driver_${index}_dob`]);
      if (!currentName) continue;
      if (autoDriversSamePerson(currentName, currentDob, name, dob)) {
        dest = index;
        break;
      }
    }
    if (!dest) {
      for (let index = 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
        if (printableDriverCell(existing[`driver_${index}_name`])) continue;
        if (taken.has(index)) continue;
        dest = index;
        break;
      }
    }
    if (!dest) continue;
    taken.add(dest);
    for (const part of AUTO_DRIVER_PARTS) {
      if (dest === 1 && part === "relationship") continue;
      const item = person[part];
      if (!item?.normalizedValue.trim()) continue;
      placed.push({ ...item, fieldKey: `driver_${dest}_${part}` });
    }
  }
  return [...rest, ...placed];
}
