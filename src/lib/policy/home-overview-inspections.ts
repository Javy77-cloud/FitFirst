/**
 * Home Overview roof / four-point structure.
 * Document ids are links into the deal library — this module never stores file bytes.
 */

import {
  FOUR_POINT_FIELD_KEYS,
  WIND_MIT_FIELD_KEYS,
  inspectionUploadIds,
} from "@/lib/quote-sheet/home-inspections";
import { propertyProtectionLabel } from "@/lib/policy/property-protection";

export const NOT_FROM_INSPECTION_NOTE = "Not from inspection documents.";

export type HomeInspectionDocument = {
  id: string;
  filename: string;
  mimeType?: string | null;
  docType?: string | null;
  createdAt?: Date | string | null;
};

export type HomeInspectionField = {
  key: string;
  label: string;
  value: string;
};

export type HomeInspectionDocumentLink = {
  id: string;
  filename: string;
  mimeType: string | null;
};

export type HomeInspectionSection = {
  id: "roof" | "four_point" | "roof_and_four_point";
  title: string;
  /** Combined section only — info was not read off an inspection file. */
  note?: string;
  document: HomeInspectionDocumentLink | null;
  fields: HomeInspectionField[];
};

export type HomeInspectionFacts = {
  documents?: readonly HomeInspectionDocument[] | null;
  risk?: {
    roofYear?: number | null;
    roofCovering?: string | null;
    openingProtection?: string | null;
  } | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  protection?: Record<string, string> | null;
  roofInstallDate?: string | null;
  nowYear?: number;
};

/** Basic property ages already stored on risk / profile / snapshot. Not the inspection catalog. */
const BASIC_KEYS = [
  "roof_year",
  "roof_covering",
  "roof_install_date",
  "hvac_year",
  "water_heater_year",
  "plumbing_year",
  "electrical_year",
] as const;

const YEAR_AGE_LABEL: Record<string, string> = {
  roof_year: "Roof age",
  hvac_year: "HVAC age",
  water_heater_year: "Water heater age",
  plumbing_year: "Plumbing age",
  electrical_year: "Electrical age",
};

function trim(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}

function cell(
  sheet: HomeInspectionFacts["sheet"],
  ...keys: string[]
): string {
  if (!sheet) return "";
  for (const key of keys) {
    const value = trim(sheet[key]?.value);
    if (value) return value;
  }
  return "";
}

function timeOf(doc: HomeInspectionDocument): number {
  if (!doc.createdAt) return 0;
  const time = doc.createdAt instanceof Date ? doc.createdAt.getTime() : Date.parse(doc.createdAt);
  return Number.isFinite(time) ? time : 0;
}

/** Four-digit year only. Does not turn an age phrase into a year. */
export function inspectionYear(value: string | null | undefined): number | null {
  const text = trim(value);
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  if (!Number.isFinite(year) || year < 1800 || year > 2100) return null;
  return year;
}

function riskValue(
  key: string,
  risk: HomeInspectionFacts["risk"],
): string {
  if (!risk) return "";
  if (key === "roof_year" && risk.roofYear != null && Number.isFinite(risk.roofYear)) {
    return String(risk.roofYear);
  }
  if (key === "roof_covering") return trim(risk.roofCovering);
  if (key === "opening_protection") return trim(risk.openingProtection);
  return "";
}

export function collectHomeInspectionValues(input: HomeInspectionFacts): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = new Set<string>([...WIND_MIT_FIELD_KEYS, ...FOUR_POINT_FIELD_KEYS]);
  for (const key of keys) {
    const value = riskValue(key, input.risk) || cell(input.sheet, key) || trim(input.protection?.[key]);
    if (value) out[key] = value;
  }
  if (!out.roof_year) {
    const alias = cell(input.sheet, "roof_age", "year_roof", "roofYear") || trim(input.protection?.roof_age);
    const year = inspectionYear(alias);
    if (year) out.roof_year = String(year);
    else if (alias) out.roof_age_text = alias;
  }
  const install =
    trim(input.roofInstallDate) || cell(input.sheet, "date_of_roof_installation", "roof_install_date");
  if (install) out.roof_install_date = install;
  return out;
}

/** Newest classified wind-mit / four-point file. Same rules as the deal documents panel. */
export function pickHomeInspectionDocuments<T extends HomeInspectionDocument>(
  docs: readonly T[] | null | undefined,
): { wind: T | null; fourPoint: T | null } {
  const ordered = [...(docs ?? [])].sort((a, b) => timeOf(a) - timeOf(b));
  const ids = inspectionUploadIds(
    ordered.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      filename: doc.filename,
    })),
  );
  return {
    wind: ordered.find((doc) => doc.id === ids.windDocumentId) ?? null,
    fourPoint: ordered.find((doc) => doc.id === ids.fourDocumentId) ?? null,
  };
}

function documentLink(doc: HomeInspectionDocument): HomeInspectionDocumentLink {
  return {
    id: doc.id,
    filename: trim(doc.filename) || "Document",
    mimeType: doc.mimeType ?? null,
  };
}

function fieldsForKeys(
  keys: readonly string[],
  values: Record<string, string>,
  nowYear: number,
): HomeInspectionField[] {
  const rows: HomeInspectionField[] = [];
  for (const key of keys) {
    const value = trim(values[key]);
    if (!value) continue;
    const label =
      key === "roof_install_date" ? "Roof installation" : propertyProtectionLabel(key);
    rows.push({ key, label, value });
    const ageLabel = YEAR_AGE_LABEL[key];
    const year = inspectionYear(value);
    if (!ageLabel || year == null) continue;
    const age = nowYear - year;
    if (age < 0 || age > 150) continue;
    rows.push({ key: `${key}_age`, label: ageLabel, value: `${age} yrs` });
  }
  if (!values.roof_year && trim(values.roof_age_text) && keys.includes("roof_year")) {
    rows.unshift({ key: "roof_age", label: "Roof age", value: trim(values.roof_age_text) });
  }
  return rows;
}

export function buildHomeOverviewInspections(input: HomeInspectionFacts): HomeInspectionSection[] {
  const values = collectHomeInspectionValues(input);
  const nowYear = input.nowYear ?? new Date().getUTCFullYear();
  const picked = pickHomeInspectionDocuments(input.documents);
  if (!picked.wind && !picked.fourPoint) {
    return [
      {
        id: "roof_and_four_point",
        title: "Roof & four-point",
        note: NOT_FROM_INSPECTION_NOTE,
        document: null,
        fields: fieldsForKeys(BASIC_KEYS, values, nowYear),
      },
    ];
  }
  const sections: HomeInspectionSection[] = [];
  if (picked.wind) {
    sections.push({
      id: "roof",
      title: "Roof details",
      document: documentLink(picked.wind),
      fields: fieldsForKeys([...WIND_MIT_FIELD_KEYS, "roof_install_date"], values, nowYear),
    });
  }
  if (picked.fourPoint) {
    sections.push({
      id: "four_point",
      title: "Four-point",
      document: documentLink(picked.fourPoint),
      fields: fieldsForKeys(FOUR_POINT_FIELD_KEYS, values, nowYear),
    });
  }
  return sections;
}
