import { blank } from "./normalize";

export const CONTACT_COPY_FIELDS = [
  "email",
  "phone",
  "mailingAddress",
  "city",
  "state",
  "zip",
  "dateOfBirth",
  "tenureStart",
  "lifeNotes",
  "healthNotes",
] as const;

export const LEAD_COPY_FIELDS = [
  "email",
  "phone",
  "mailingAddress",
  "city",
  "state",
  "zip",
  "dateOfBirth",
  "source",
  "convertedDealId",
] as const;

export const NOTE_FIELDS = ["notes", "lifeNotes", "healthNotes"] as const;

export type FieldPatch = Record<string, unknown>;

function earlierDate(a: unknown, b: unknown): unknown {
  if (blank(a)) return b;
  if (blank(b)) return a;
  const da = a instanceof Date ? a : new Date(String(a));
  const db = b instanceof Date ? b : new Date(String(b));
  if (Number.isNaN(da.getTime())) return blank(b) ? a : b;
  if (Number.isNaN(db.getTime())) return a;
  return da.getTime() <= db.getTime() ? a : b;
}

function appendText(keeper: unknown, duplicate: unknown): string | null {
  const k = blank(keeper) ? "" : String(keeper).trim();
  const d = blank(duplicate) ? "" : String(duplicate).trim();
  if (!k) return d || null;
  if (!d || k.includes(d)) return k;
  return `${k}\n\n— from merged record —\n${d}`;
}

export function copyMissingFields(
  keeper: Record<string, unknown>,
  duplicate: Record<string, unknown>,
  fields: readonly string[],
): { next: Record<string, unknown>; copiedFields: string[]; patch: FieldPatch } {
  const next = { ...keeper };
  const copiedFields: string[] = [];
  const patch: FieldPatch = {};

  for (const field of fields) {
    const keeperVal = keeper[field];
    const dupVal = duplicate[field];
    if (blank(keeperVal) && !blank(dupVal)) {
      next[field] = dupVal;
      patch[field] = dupVal;
      copiedFields.push(field);
    }
  }

  for (const field of NOTE_FIELDS) {
    if (!(field in keeper) && !(field in duplicate)) continue;
    const merged = appendText(keeper[field], duplicate[field]);
    const keeperText = blank(keeper[field]) ? "" : String(keeper[field]).trim();
    if (merged && merged !== keeperText) {
      next[field] = merged;
      patch[field] = merged;
      if (!copiedFields.includes(field)) copiedFields.push(field);
    }
  }

  if ("tenureStart" in keeper || "tenureStart" in duplicate) {
    const tenure = earlierDate(keeper.tenureStart, duplicate.tenureStart);
    if (!blank(tenure) && tenure !== keeper.tenureStart) {
      next.tenureStart = tenure;
      patch.tenureStart = tenure;
      if (!copiedFields.includes("tenureStart")) copiedFields.push("tenureStart");
    }
  }

  if ("policyCount" in keeper || "policyCount" in duplicate) {
    const sum = Number(keeper.policyCount ?? 0) + Number(duplicate.policyCount ?? 0);
    if (sum !== Number(keeper.policyCount ?? 0)) {
      next.policyCount = sum;
      patch.policyCount = sum;
      copiedFields.push("policyCount");
    }
  }

  return { next, copiedFields, patch };
}
