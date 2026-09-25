/**
 * Map one declaration extract onto a policy's Overview + Coverage (HO/DP)
 * or Vehicles + Coverage (Auto). Does not touch deal quote_sheets.
 */
import type { MintGeminiRow } from "@/lib/policy/mint-gate";
import {
  isDeclarationPdf,
  isIssuedPolicyDocument,
  isNoMortgageValue,
  normalizeMintFieldKey,
} from "@/lib/policy/mint-gate";
import { parsePropertyYear } from "@/lib/policy/dwelling-facts";
import { splitPremisesAddress, type PremisesAddressParts } from "@/lib/policy/premises";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import { normalizeDeductibleDisplay } from "@/lib/renewal/fill-compare-from-decs";
import { parseMoney } from "@/lib/renewal/compare";

export type FillSource = "issue" | "manual";

export type FillClassify = {
  filled: string[];
  overwritten: string[];
  skipped: string[];
};

export type PolicyFillAuditInsert = {
  tenantId: string;
  policyId: string;
  policyNumber: string;
  source: FillSource;
  agentId: string | null;
  agentName: string;
  reason: string | null;
  documentId: string | null;
  documentFilename: string | null;
  fieldsWritten: string[];
  fieldsOverwritten: string[];
};

export type DecDocLike = {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  docType?: string | null;
  slot?: string | null;
  createdAt?: Date | string | null;
};

type VehicleWriteField =
  | "vin"
  | "year"
  | "make"
  | "model"
  | "usage"
  | "garagingZip"
  | "garagingAddress";

export type AppliedVehicle = {
  identity: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  usage?: string;
  garagingZip?: string;
  garagingAddress?: string;
  write: VehicleWriteField[];
};

export type AppliedDriver = {
  identity: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  licenseNumber?: string;
};

export type AppliedFillPatch = {
  policy: {
    premisesAddress?: string;
    premisesCity?: string;
    premisesState?: string;
    premisesZip?: string;
    coverageA?: number;
    formType?: string;
    premium?: string;
  };
  risk: {
    yearBuilt?: number;
    construction?: string;
    occupancy?: string;
    county?: string;
    protectionClass?: string;
    roofYear?: number;
    roofCovering?: string;
    coverageA?: number;
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  coverageLimits: Record<string, string>;
  protection: Record<string, string>;
  contact: {
    mailingAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mortgagee: { name?: string; loanNumber?: string };
  term: {
    premium?: string;
    aopDeductible?: string;
    hurricaneDeductible?: string;
    comprehensiveDeductible?: string;
    collisionDeductible?: string;
  };
  vehicles: AppliedVehicle[];
  drivers: AppliedDriver[];
};

export function fillOverwriteWarning(count: number): string {
  const n = Math.max(0, Math.floor(count));
  return `replaces ${n} ${n === 1 ? "field" : "fields"}`;
}

export function countFillOverwrites(classified: Pick<FillClassify, "overwritten">): number {
  return classified.overwritten.length;
}

/** Manual re-fill must carry a non-blank reason. Issue does not. */
export function manualFillReasonError(
  source: FillSource,
  reason: string | null | undefined,
): string | null {
  if (source !== "manual") return null;
  if (!String(reason ?? "").trim()) return "Reason is required.";
  return null;
}

export function formatFillServerTime(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);
}

export function buildPolicyFillAuditInsert(input: PolicyFillAuditInsert): PolicyFillAuditInsert {
  return {
    tenantId: input.tenantId,
    policyId: input.policyId,
    policyNumber: input.policyNumber,
    source: input.source,
    agentId: input.agentId,
    agentName: input.agentName.trim() || (input.source === "issue" ? "System" : "Agent"),
    reason: input.source === "manual" ? String(input.reason ?? "").trim() || null : null,
    documentId: input.documentId,
    documentFilename: input.documentFilename,
    fieldsWritten: [...input.fieldsWritten],
    fieldsOverwritten: [...input.fieldsOverwritten],
  };
}

export function fillFamilyForPolicy(input: {
  lineOfBusiness?: string | null;
  policyType?: string | null;
  insuranceType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
}): "homeowners" | "auto" | "other" {
  const family = resolveLobOverviewFamily(input);
  if (family === "auto") return "auto";
  if (family === "homeowners") return "homeowners";
  return "other";
}

function createdAtMs(doc: DecDocLike): number {
  if (!doc.createdAt) return 0;
  const t = new Date(doc.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

function looksLikeDec(doc: DecDocLike): boolean {
  return isDeclarationPdf(doc) || isIssuedPolicyDocument(doc);
}

/** Prefer an explicit file, then the policy source DEC, then the newest declaration. */
export function pickPolicyDecDocument<T extends DecDocLike>(
  docs: readonly T[],
  input?: { documentId?: string | null; sourceDocumentId?: string | null },
): T | null {
  const preferred = (input?.documentId ?? "").trim();
  if (preferred) {
    return docs.find((doc) => doc.id === preferred) ?? null;
  }
  const sourceId = (input?.sourceDocumentId ?? "").trim();
  if (sourceId) {
    const source = docs.find((doc) => doc.id === sourceId && looksLikeDec(doc));
    if (source) return source;
  }
  const decs = docs.filter(looksLikeDec);
  decs.sort((a, b) => createdAtMs(b) - createdAtMs(a) || a.id.localeCompare(b.id));
  return decs[0] ?? null;
}

function rawCell(rows: readonly MintGeminiRow[], ...keys: string[]): string {
  for (const key of keys) {
    const wanted = normalizeMintFieldKey(key);
    for (const row of rows) {
      if (normalizeMintFieldKey(row.fieldKey) !== wanted) continue;
      const value = String(row.normalizedValue || row.rawValue || "").trim();
      if (value) return value;
    }
  }
  return "";
}

function put(out: Record<string, string>, key: string, value: string | null | undefined) {
  const next = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!next) return;
  out[key] = next;
}

function yesNo(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  if (/^(y|yes|true)$/.test(value)) return "Yes";
  if (/^(n|no|false)$/.test(value)) return "No";
  return raw.trim();
}

function moneyLabel(raw: string): string {
  const n = parseMoney(raw);
  if (n == null) return raw.trim();
  const negative = n < 0;
  const abs = Math.abs(n);
  const digits = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2);
  const [whole, frac] = digits.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = frac ? `$${withCommas}.${frac}` : `$${withCommas}`;
  return negative ? `-${body}` : body;
}

/** Keep prose limits ("ERS FULL", "Insured Rejects"). Format pure money. */
export function formatDecLimit(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (/[a-z]/i.test(trimmed)) return trimmed;
  if (trimmed.includes("/")) {
    return trimmed
      .split("/")
      .map((part) => {
        const piece = part.trim();
        if (!piece || /[a-z]/i.test(piece)) return piece;
        return moneyLabel(piece);
      })
      .join("/");
  }
  return moneyLabel(trimmed);
}

/** Keep both a percent and a dollar when the dec prints both (Gloria hurricane). */
export function formatDecDeductible(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const pctMatches = [...trimmed.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  const money = trimmed.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (pctMatches.length > 0 && money) {
    const pctRaw = pctMatches[pctMatches.length - 1]![1]!;
    const pct = Number(pctRaw);
    const pctText = Number.isFinite(pct) && pct % 1 === 0 ? `${pct}%` : `${pctRaw}%`;
    return `${pctText} (${moneyLabel(money[1]!)})`;
  }
  return normalizeDeductibleDisplay(trimmed) ?? (/[a-z]/i.test(trimmed) ? trimmed : moneyLabel(trimmed));
}

function splitDecAddress(raw: string): PremisesAddressParts {
  const text = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+[A-Za-z .'-]*\bcounty\b\.?$/i, "")
    .trim();
  if (!text) return { street: "", city: null, state: null, zip: null };
  const direct = text.match(/^(.+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?(?:\b.*)?$/i);
  if (direct) {
    const left = direct[1]!.trim();
    const state = direct[2]!.toUpperCase();
    const zip = direct[3]!;
    const comma = left.lastIndexOf(",");
    if (comma > 0) {
      return {
        street: left.slice(0, comma).trim(),
        city: left.slice(comma + 1).trim() || null,
        state,
        zip,
      };
    }
    const words = left.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return {
        street: words.slice(0, -1).join(" "),
        city: words[words.length - 1]!,
        state,
        zip,
      };
    }
  }
  return splitPremisesAddress(text);
}

function putAddress(
  out: Record<string, string>,
  prefix: "premises" | "mailing",
  raw: string,
) {
  if (!raw.trim()) return;
  const parts = splitDecAddress(raw);
  const streetKey = prefix === "premises" ? "premisesAddress" : "mailingAddress";
  const cityKey = prefix === "premises" ? "premisesCity" : "mailingCity";
  const stateKey = prefix === "premises" ? "premisesState" : "mailingState";
  const zipKey = prefix === "premises" ? "premisesZip" : "mailingZip";
  put(out, streetKey, parts.street);
  put(out, cityKey, parts.city);
  put(out, stateKey, parts.state);
  put(out, zipKey, parts.zip);
}

function coverageMoney(rows: readonly MintGeminiRow[], ...keys: string[]): string {
  const raw = rawCell(rows, ...keys);
  return raw ? formatDecLimit(raw) : "";
}

function proposeHome(rows: readonly MintGeminiRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  putAddress(
    out,
    "premises",
    rawCell(
      rows,
      "property_address",
      "location_description",
      "property_information",
      "insured_property",
      "residence_premises",
      "address",
      "address1",
    ),
  );
  putAddress(out, "mailing", rawCell(rows, "mailing_address", "contact_mailing_address"));

  const year =
    parsePropertyYear(rawCell(rows, "year_built", "year_constructed", "yr_built")) ?? null;
  if (year) put(out, "yearBuilt", String(year));
  put(out, "construction", rawCell(rows, "construction", "construction_type"));

  const dwellingRaw = rawCell(rows, "dwelling_type", "townhouse_rowhouse", "townhouse");
  const dwellingYn = yesNo(dwellingRaw);
  if (/townhouse|rowhouse/i.test(dwellingRaw) || dwellingYn === "Yes") {
    put(out, "dwellingType", /townhouse|rowhouse/i.test(dwellingRaw) && dwellingYn !== "Yes" && dwellingYn !== "No"
      ? dwellingRaw
      : "Townhouse/Rowhouse");
  } else if (dwellingRaw && dwellingYn !== "No" && dwellingYn !== "Yes") {
    put(out, "dwellingType", dwellingRaw);
  }

  put(out, "families", rawCell(rows, "number_of_families", "families"));
  const occupied = rawCell(rows, "occupancy", "occupied");
  const occupiedYn = yesNo(occupied);
  if (occupiedYn === "Yes" || occupiedYn === "No") put(out, "occupancy", occupiedYn);
  else put(out, "occupancy", occupied);

  put(out, "protectionClass", rawCell(rows, "protection_class"));
  put(out, "bceg", rawCell(rows, "bceg_grade", "bceg"));
  put(out, "county", rawCell(rows, "county"));
  put(out, "dwellingReplacementCost", yesNo(rawCell(rows, "dwelling_replacement_cost")));
  put(
    out,
    "personalPropertyReplacementCost",
    yesNo(rawCell(rows, "personal_property_replacement_cost")),
  );
  put(out, "burglarAlarm", yesNo(rawCell(rows, "burglar_alarm", "burglar")));
  put(out, "fireAlarm", yesNo(rawCell(rows, "fire_alarm")));
  put(out, "sprinkler", yesNo(rawCell(rows, "sprinkler")));

  const mortgagee = rawCell(rows, "mortgagee", "mortgagee_name");
  if (mortgagee && !isNoMortgageValue(mortgagee)) put(out, "mortgageeName", mortgagee);
  put(out, "mortgageeLoanNumber", rawCell(rows, "loan_number"));

  put(out, "formType", rawCell(rows, "form", "policy_form"));

  const coverageA = parseMoney(rawCell(rows, "coverage_a", "dwelling"));
  if (coverageA != null && coverageA > 0) put(out, "coverageA", String(Math.round(coverageA)));
  put(out, "coverageB", coverageMoney(rows, "coverage_b"));
  put(out, "coverageC", coverageMoney(rows, "coverage_c"));
  put(out, "coverageD", coverageMoney(rows, "coverage_d"));
  put(out, "coverageE", coverageMoney(rows, "coverage_e"));
  put(out, "coverageF", coverageMoney(rows, "coverage_f"));
  put(out, "ordinanceOrLaw", formatDecDeductible(rawCell(rows, "ordinance_or_law", "ordinance_law")));
  put(out, "aopDeductible", formatDecDeductible(rawCell(rows, "aop_deductible")));
  put(out, "hurricaneDeductible", formatDecDeductible(rawCell(rows, "hurricane_deductible")));

  const roofInstall = rawCell(rows, "date_of_roof_installation", "roof_install_date");
  put(out, "roofInstallDate", roofInstall);
  const roofYear =
    parsePropertyYear(rawCell(rows, "roof_year", "roof_age", "year_roof")) ??
    parsePropertyYear(roofInstall);
  if (roofYear) put(out, "roofYear", String(roofYear));
  put(
    out,
    "roofCovering",
    rawCell(rows, "roof_material", "roof_covering", "dwelling_roofing_material"),
  );

  const unitYear = parsePropertyYear(rawCell(rows, "unit_year", "mh_year"));
  if (unitYear) put(out, "unitYear", String(unitYear));
  put(out, "unitMake", rawCell(rows, "unit_make", "mh_make"));
  put(out, "unitSerial", rawCell(rows, "unit_serial", "mh_serial"));
  put(out, "unitLength", rawCell(rows, "unit_length", "mh_length"));
  put(out, "unitWidth", rawCell(rows, "unit_width", "mh_width"));
  put(out, "scheduledCarport", formatDecLimit(rawCell(rows, "scheduled_carport")));
  put(out, "scheduledScreenRoom", formatDecLimit(rawCell(rows, "scheduled_screen_room")));
  put(out, "scheduledShed", formatDecLimit(rawCell(rows, "scheduled_shed")));

  const premium = parseMoney(rawCell(rows, "premium", "current_premium"));
  if (premium != null) put(out, "premium", premium.toFixed(2));
  return out;
}

export function vehicleIdentity(input: {
  vin?: string | null;
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
}): string {
  const vin = String(input.vin ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (vin) return `vin:${vin}`;
  const slug = [input.year, input.make, input.model]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
  return slug ? `ymm:${slug}` : "";
}

export function driverIdentity(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/\./g, "");
}

function splitPerson(full: string): { first: string; last: string } | null {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return { first: parts[0]!, last: parts[0]! };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

function vehicleSuffix(index: number, suffix: string): string[] {
  if (index === 1) {
    if (suffix === "vin") return ["vin", "vehicle_1_vin"];
    if (suffix === "usage") return ["vehicle_usage", "vehicle_1_usage", "usage"];
    return [`vehicle_${suffix}`, `vehicle_1_${suffix}`];
  }
  return [`vehicle_${index}_${suffix}`];
}

function proposeAuto(rows: readonly MintGeminiRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  putAddress(out, "mailing", rawCell(rows, "mailing_address", "contact_mailing_address"));
  const premium = parseMoney(rawCell(rows, "premium", "current_premium"));
  if (premium != null) put(out, "premium", premium.toFixed(2));

  put(out, "liabilityBi", formatDecLimit(rawCell(rows, "liability_bi")));
  put(out, "liabilityPd", formatDecLimit(rawCell(rows, "liability_pd")));
  put(out, "umUim", formatDecLimit(rawCell(rows, "um_uim")));
  put(out, "pip", formatDecLimit(rawCell(rows, "pip")));
  put(out, "medPay", formatDecLimit(rawCell(rows, "med_pay")));
  put(out, "rental", formatDecLimit(rawCell(rows, "rental")));
  put(out, "towing", formatDecLimit(rawCell(rows, "towing", "ers", "emergency_road_service")));
  put(
    out,
    "comprehensiveDeductible",
    formatDecDeductible(rawCell(rows, "comp_deductible", "comprehensive_deductible", "comprehensive")),
  );
  put(out, "collisionDeductible", formatDecDeductible(rawCell(rows, "collision_deductible")));

  for (let index = 1; index <= 4; index += 1) {
    const vin = rawCell(rows, ...vehicleSuffix(index, "vin"));
    const year = rawCell(rows, ...vehicleSuffix(index, "year"));
    const make = rawCell(rows, ...vehicleSuffix(index, "make"));
    const model = rawCell(rows, ...vehicleSuffix(index, "model"));
    const identity = vehicleIdentity({ vin, year, make, model });
    if (!identity) continue;
    const prefix = `vehicle:${identity}`;
    put(out, `${prefix}.vin`, vin.replace(/\s+/g, "").toUpperCase());
    const yearN = parsePropertyYear(year) ?? Number(year.replace(/[^\d]/g, "").slice(0, 4));
    if (Number.isFinite(yearN) && yearN >= 1900 && yearN <= 2100) put(out, `${prefix}.year`, String(yearN));
    put(out, `${prefix}.make`, make);
    put(out, `${prefix}.model`, model);
    put(out, `${prefix}.usage`, rawCell(rows, ...vehicleSuffix(index, "usage")));
    const garagingZipKeys =
      index === 1
        ? [...vehicleSuffix(index, "garaging_zip"), "garaging_zip"]
        : vehicleSuffix(index, "garaging_zip");
    const garagingAddressKeys =
      index === 1
        ? [...vehicleSuffix(index, "garaging_address"), "garaging_address"]
        : vehicleSuffix(index, "garaging_address");
    put(out, `${prefix}.garagingZip`, rawCell(rows, ...garagingZipKeys));
    put(out, `${prefix}.garagingAddress`, rawCell(rows, ...garagingAddressKeys));
    if (index > 1) {
      put(
        out,
        `vehicle_${index}_comprehensive`,
        formatDecDeductible(rawCell(rows, `vehicle_${index}_comp_deductible`)),
      );
      put(
        out,
        `vehicle_${index}_collision`,
        formatDecDeductible(rawCell(rows, `vehicle_${index}_collision_deductible`)),
      );
      put(out, `vehicle_${index}_rental`, formatDecLimit(rawCell(rows, `vehicle_${index}_rental`)));
      put(out, `vehicle_${index}_towing`, formatDecLimit(rawCell(rows, `vehicle_${index}_towing`)));
    }
  }

  for (let index = 1; index <= 4; index += 1) {
    const name = rawCell(rows, `driver_${index}_name`);
    const person = splitPerson(name);
    if (!person) continue;
    const identity = driverIdentity(name);
    put(out, `driver:${identity}.name`, name.trim());
    put(out, `driver:${identity}.dob`, rawCell(rows, `driver_${index}_dob`));
    put(out, `driver:${identity}.license`, rawCell(rows, `driver_${index}_license`));
  }
  return out;
}

export function proposeFillFromDec(input: {
  family: "homeowners" | "auto" | "other";
  rows: readonly MintGeminiRow[];
}): Record<string, string> {
  const sniffed =
    input.family === "other"
      ? rawCell(input.rows, "vin", "vehicle_year", "vehicle_2_vin")
        ? "auto"
        : "homeowners"
      : input.family;
  return sniffed === "auto" ? proposeAuto(input.rows) : proposeHome(input.rows);
}

function licenseTail(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").slice(-4).toLowerCase();
}

export function fillValuesEqual(key: string, prev: string, next: string): boolean {
  if (key.endsWith(".license")) {
    const a = licenseTail(prev);
    const b = licenseTail(next);
    return Boolean(a && b && a === b);
  }
  const norm = (value: string) =>
    value.trim().toLowerCase().replace(/[$,]/g, "").replace(/\s+/g, " ");
  return norm(prev) === norm(next);
}

export function classifyFillFields(
  existing: Record<string, string>,
  proposed: Record<string, string>,
): FillClassify {
  const filled: string[] = [];
  const overwritten: string[] = [];
  const skipped: string[] = [];
  for (const key of Object.keys(proposed).sort()) {
    const next = proposed[key]?.trim() ?? "";
    if (!next) {
      skipped.push(key);
      continue;
    }
    const prev = (existing[key] ?? "").trim();
    if (!prev) filled.push(key);
    else if (fillValuesEqual(key, prev, next)) skipped.push(key);
    else overwritten.push(key);
  }
  return { filled, overwritten, skipped };
}

const LIMIT_KEYS: Record<string, string> = {
  coverage_b: "coverageB",
  coverage_c: "coverageC",
  coverage_d: "coverageD",
  coverage_e: "coverageE",
  coverage_f: "coverageF",
  ordinance_or_law: "ordinanceOrLaw",
  dwelling_type: "dwellingType",
  number_of_families: "families",
  dwelling_replacement_cost: "dwellingReplacementCost",
  personal_property_replacement_cost: "personalPropertyReplacementCost",
  unit_year: "unitYear",
  unit_make: "unitMake",
  unit_serial: "unitSerial",
  unit_length: "unitLength",
  unit_width: "unitWidth",
  date_of_roof_installation: "roofInstallDate",
  scheduled_carport: "scheduledCarport",
  scheduled_screen_room: "scheduledScreenRoom",
  scheduled_shed: "scheduledShed",
  liability_bi: "liabilityBi",
  liability_pd: "liabilityPd",
  um_uim: "umUim",
  pip: "pip",
  med_pay: "medPay",
  rental: "rental",
  towing: "towing",
};

export type FillSnapshotInput = {
  policy?: {
    premisesAddress?: string | null;
    premisesCity?: string | null;
    premisesState?: string | null;
    premisesZip?: string | null;
    coverageA?: number | null;
    formType?: string | null;
    premium?: string | number | null;
    coverageLimits?: Record<string, string> | null;
  } | null;
  risk?: {
    yearBuilt?: number | null;
    construction?: string | null;
    occupancy?: string | null;
    county?: string | null;
    protectionClass?: string | null;
    roofYear?: number | null;
    roofCovering?: string | null;
  } | null;
  protection?: Record<string, string> | null;
  contact?: {
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  mortgagee?: { name?: string | null; loanNumber?: string | null } | null;
  term?: {
    premium?: string | number | null;
    aopDeductible?: string | null;
    hurricaneDeductible?: string | null;
    comprehensiveDeductible?: string | null;
    collisionDeductible?: string | null;
  } | null;
  vehicles?: Array<{
    vin?: string | null;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    usage?: string | null;
    garagingZip?: string | null;
    garagingAddress?: string | null;
  }>;
  drivers?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    licenseLast4?: string | null;
  }>;
};

export function snapshotFillTargets(input: FillSnapshotInput): Record<string, string> {
  const out: Record<string, string> = {};
  const policy = input.policy;
  put(out, "premisesAddress", policy?.premisesAddress);
  put(out, "premisesCity", policy?.premisesCity);
  put(out, "premisesState", policy?.premisesState);
  put(out, "premisesZip", policy?.premisesZip);
  if (policy?.coverageA != null && Number.isFinite(policy.coverageA)) {
    put(out, "coverageA", String(policy.coverageA));
  }
  put(out, "formType", policy?.formType);
  const premium = policy?.premium ?? input.term?.premium;
  if (premium != null && String(premium).trim()) put(out, "premium", String(premium));
  for (const [limitKey, fieldKey] of Object.entries(LIMIT_KEYS)) {
    put(out, fieldKey, policy?.coverageLimits?.[limitKey]);
  }
  for (const [key, value] of Object.entries(policy?.coverageLimits ?? {})) {
    if (/^vehicle_[2-4]_(comprehensive|collision|rental|towing)$/.test(key)) {
      put(out, key, value);
    }
  }

  const risk = input.risk;
  if (risk?.yearBuilt != null) put(out, "yearBuilt", String(risk.yearBuilt));
  put(out, "construction", risk?.construction);
  put(out, "occupancy", risk?.occupancy);
  put(out, "county", risk?.county);
  put(out, "protectionClass", risk?.protectionClass || input.protection?.protection_class);
  if (risk?.roofYear != null) put(out, "roofYear", String(risk.roofYear));
  put(out, "roofCovering", risk?.roofCovering || input.protection?.roof_covering);
  put(out, "bceg", input.protection?.bceg_grade);
  put(out, "burglarAlarm", input.protection?.burglar_alarm);
  put(out, "fireAlarm", input.protection?.fire_alarm);
  put(out, "sprinkler", input.protection?.sprinkler);

  put(out, "mailingAddress", input.contact?.mailingAddress);
  put(out, "mailingCity", input.contact?.city);
  put(out, "mailingState", input.contact?.state);
  put(out, "mailingZip", input.contact?.zip);
  put(out, "mortgageeName", input.mortgagee?.name);
  put(out, "mortgageeLoanNumber", input.mortgagee?.loanNumber);
  put(out, "aopDeductible", input.term?.aopDeductible);
  put(out, "hurricaneDeductible", input.term?.hurricaneDeductible);
  put(out, "comprehensiveDeductible", input.term?.comprehensiveDeductible);
  put(out, "collisionDeductible", input.term?.collisionDeductible);

  for (const vehicle of input.vehicles ?? []) {
    const identity = vehicleIdentity(vehicle);
    if (!identity) continue;
    const prefix = `vehicle:${identity}`;
    put(out, `${prefix}.vin`, vehicle.vin?.replace(/\s+/g, "").toUpperCase());
    if (vehicle.year != null) put(out, `${prefix}.year`, String(vehicle.year));
    put(out, `${prefix}.make`, vehicle.make);
    put(out, `${prefix}.model`, vehicle.model);
    put(out, `${prefix}.usage`, vehicle.usage);
    put(out, `${prefix}.garagingZip`, vehicle.garagingZip);
    put(out, `${prefix}.garagingAddress`, vehicle.garagingAddress);
  }

  for (const driver of input.drivers ?? []) {
    const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ");
    const identity = driverIdentity(name);
    if (!identity) continue;
    put(out, `driver:${identity}.name`, name);
    put(out, `driver:${identity}.dob`, driver.dateOfBirth);
    put(out, `driver:${identity}.license`, driver.licenseLast4);
  }
  return out;
}

function allowedValue(proposed: Record<string, string>, allowed: ReadonlySet<string>, key: string) {
  return allowed.has(key) ? proposed[key] : undefined;
}

export function groupAppliedFill(
  proposed: Record<string, string>,
  allowedKeys: readonly string[],
): AppliedFillPatch {
  const allowed = new Set(allowedKeys);
  const patch: AppliedFillPatch = {
    policy: {},
    risk: {},
    coverageLimits: {},
    protection: {},
    contact: {},
    mortgagee: {},
    term: {},
    vehicles: [],
    drivers: [],
  };
  const take = (key: string) => allowedValue(proposed, allowed, key);

  const premisesAddress = take("premisesAddress");
  const premisesCity = take("premisesCity");
  const premisesState = take("premisesState");
  const premisesZip = take("premisesZip");
  if (premisesAddress) patch.policy.premisesAddress = premisesAddress;
  if (premisesCity) patch.policy.premisesCity = premisesCity;
  if (premisesState) patch.policy.premisesState = premisesState;
  if (premisesZip) patch.policy.premisesZip = premisesZip;
  if (premisesAddress) patch.risk.address1 = premisesAddress;
  if (premisesCity) patch.risk.city = premisesCity;
  if (premisesState) patch.risk.state = premisesState;
  if (premisesZip) patch.risk.zip = premisesZip;

  const mailingAddress = take("mailingAddress");
  const mailingCity = take("mailingCity");
  const mailingState = take("mailingState");
  const mailingZip = take("mailingZip");
  if (mailingAddress) patch.contact.mailingAddress = mailingAddress;
  if (mailingCity) patch.contact.city = mailingCity;
  if (mailingState) patch.contact.state = mailingState;
  if (mailingZip) patch.contact.zip = mailingZip;

  const yearBuilt = take("yearBuilt");
  if (yearBuilt) {
    const year = Number(yearBuilt);
    if (Number.isFinite(year)) patch.risk.yearBuilt = year;
  }
  const construction = take("construction");
  if (construction) patch.risk.construction = construction;
  const occupancy = take("occupancy");
  if (occupancy) patch.risk.occupancy = occupancy;
  const county = take("county");
  if (county) patch.risk.county = county;
  const protectionClass = take("protectionClass");
  if (protectionClass) {
    patch.risk.protectionClass = protectionClass;
    patch.protection.protection_class = protectionClass;
  }
  const roofYear = take("roofYear");
  if (roofYear) {
    const year = Number(roofYear);
    if (Number.isFinite(year)) patch.risk.roofYear = year;
  }
  const roofCovering = take("roofCovering");
  if (roofCovering) {
    patch.risk.roofCovering = roofCovering;
    patch.protection.roof_covering = roofCovering;
  }
  const bceg = take("bceg");
  if (bceg) patch.protection.bceg_grade = bceg;
  const burglar = take("burglarAlarm");
  if (burglar) patch.protection.burglar_alarm = burglar;
  const fire = take("fireAlarm");
  if (fire) patch.protection.fire_alarm = fire;
  const sprinkler = take("sprinkler");
  if (sprinkler) patch.protection.sprinkler = sprinkler;

  const coverageA = take("coverageA");
  if (coverageA) {
    const n = Number(coverageA);
    if (Number.isFinite(n)) {
      patch.policy.coverageA = Math.round(n);
      patch.risk.coverageA = Math.round(n);
    }
  }
  const formType = take("formType");
  if (formType) patch.policy.formType = formType;
  const premium = take("premium");
  if (premium) {
    patch.policy.premium = premium;
    patch.term.premium = premium;
  }

  const limitPairs: Array<[string, string]> = [
    ["coverageB", "coverage_b"],
    ["coverageC", "coverage_c"],
    ["coverageD", "coverage_d"],
    ["coverageE", "coverage_e"],
    ["coverageF", "coverage_f"],
    ["ordinanceOrLaw", "ordinance_or_law"],
    ["dwellingType", "dwelling_type"],
    ["families", "number_of_families"],
    ["dwellingReplacementCost", "dwelling_replacement_cost"],
    ["personalPropertyReplacementCost", "personal_property_replacement_cost"],
    ["unitYear", "unit_year"],
    ["unitMake", "unit_make"],
    ["unitSerial", "unit_serial"],
    ["unitLength", "unit_length"],
    ["unitWidth", "unit_width"],
    ["roofInstallDate", "date_of_roof_installation"],
    ["scheduledCarport", "scheduled_carport"],
    ["scheduledScreenRoom", "scheduled_screen_room"],
    ["scheduledShed", "scheduled_shed"],
    ["liabilityBi", "liability_bi"],
    ["liabilityPd", "liability_pd"],
    ["umUim", "um_uim"],
    ["pip", "pip"],
    ["medPay", "med_pay"],
    ["rental", "rental"],
    ["towing", "towing"],
  ];
  for (const [fieldKey, limitKey] of limitPairs) {
    const value = take(fieldKey);
    if (value) patch.coverageLimits[limitKey] = value;
  }
  for (const key of allowed) {
    if (/^vehicle_[2-4]_(comprehensive|collision|rental|towing)$/.test(key) && proposed[key]) {
      patch.coverageLimits[key] = proposed[key]!;
    }
  }

  const aop = take("aopDeductible");
  if (aop) patch.term.aopDeductible = aop;
  const hurricane = take("hurricaneDeductible");
  if (hurricane) patch.term.hurricaneDeductible = hurricane;
  const comp = take("comprehensiveDeductible");
  if (comp) patch.term.comprehensiveDeductible = comp;
  const collision = take("collisionDeductible");
  if (collision) patch.term.collisionDeductible = collision;

  const mortgageeName = take("mortgageeName");
  const mortgageeLoan = take("mortgageeLoanNumber");
  if (mortgageeName) patch.mortgagee.name = mortgageeName;
  if (mortgageeLoan) patch.mortgagee.loanNumber = mortgageeLoan;

  const vehicles = new Map<string, AppliedVehicle>();
  for (const key of allowed) {
    const match = key.match(
      /^vehicle:(.+)\.(vin|year|make|model|usage|garagingZip|garagingAddress)$/,
    );
    if (!match) continue;
    const identity = match[1]!;
    const field = match[2] as VehicleWriteField;
    const value = proposed[key];
    if (!value) continue;
    const row =
      vehicles.get(identity) ??
      ({
        identity,
        write: [],
      } satisfies AppliedVehicle);
    row.write.push(field);
    if (field === "year") {
      const year = Number(value);
      if (Number.isFinite(year)) row.year = year;
    } else if (field === "vin") row.vin = value;
    else if (field === "make") row.make = value;
    else if (field === "model") row.model = value;
    else if (field === "usage") row.usage = value;
    else if (field === "garagingZip") row.garagingZip = value;
    else if (field === "garagingAddress") row.garagingAddress = value;
    vehicles.set(identity, row);
  }
  for (const row of vehicles.values()) {
    const prefix = `vehicle:${row.identity}`;
    row.vin = row.vin ?? proposed[`${prefix}.vin`];
    row.make = row.make ?? proposed[`${prefix}.make`];
    row.model = row.model ?? proposed[`${prefix}.model`];
    if (row.year == null && proposed[`${prefix}.year`]) {
      const year = Number(proposed[`${prefix}.year`]);
      if (Number.isFinite(year)) row.year = year;
    }
    patch.vehicles.push(row);
  }

  const drivers = new Map<string, AppliedDriver>();
  for (const key of allowed) {
    const match = key.match(/^driver:(.+)\.(name|dob|license)$/);
    if (!match) continue;
    const identity = match[1]!;
    const name = proposed[`driver:${identity}.name`] ?? "";
    const person = splitPerson(name);
    if (!person) continue;
    const row =
      drivers.get(identity) ??
      ({
        identity,
        firstName: person.first,
        lastName: person.last,
      } satisfies AppliedDriver);
    if (match[2] === "dob") row.dateOfBirth = proposed[key];
    if (match[2] === "license") row.licenseNumber = proposed[key];
    drivers.set(identity, row);
  }
  patch.drivers = [...drivers.values()];
  return patch;
}
