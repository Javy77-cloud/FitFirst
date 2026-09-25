/**
 * Map one declaration extract onto a policy's Overview + Coverage (HO/DP)
 * or Vehicles + Coverage (Auto). Does not touch deal quote_sheets.
 */
import { monthsBetweenTermDates } from "@/lib/documents/document-labels";
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
import { businessDateKey, noonUtcFromBusinessDate } from "@/lib/policies/current-term";
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
  | "garagingAddress"
  | "annualMiles"
  | "lienholder"
  | "premium"
  | "comprehensiveDeductible"
  | "collisionDeductible";

export type AppliedVehicle = {
  identity: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  usage?: string;
  garagingZip?: string;
  garagingAddress?: string;
  annualMiles?: string;
  lienholder?: string;
  premium?: string;
  comprehensiveDeductible?: string;
  collisionDeductible?: string;
  write: VehicleWriteField[];
};

export type AppliedDriver = {
  identity: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  licenseNumber?: string;
  licenseState?: string;
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
    effectiveDate?: Date;
    expirationDate?: Date;
    termMonths?: number;
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
    termEffective?: Date;
    termExpiration?: Date;
  };
  vehicles: AppliedVehicle[];
  drivers: AppliedDriver[];
};

/** Neutral notice after a manual fill marks the declaration Current. */
export const FILL_DEC_CURRENT_NOTICE =
  "This declaration page is set as the current policy. Change term role if this isn't right.";

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

const TERM_MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function ymd(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Calendar day printed on a DEC. Storage key is YYYY-MM-DD. */
export function parseDecTermDate(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const slash = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return ymd(year, Number(slash[1]), Number(slash[2]));
  }
  const named = text.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (named) {
    const month = TERM_MONTH_NAMES[named[1]!.toLowerCase()];
    if (!month) return null;
    return ymd(Number(named[3]), month, Number(named[2]));
  }
  return null;
}

/** Printed "6 month" / "semi-annual" / "12". Null when the dec does not say. */
export function parsePrintedTermMonths(raw: string | null | undefined): number | null {
  const text = (raw ?? "").trim().toLowerCase();
  if (!text) return null;
  if (/semi[-\s]?annual|\b6\s*-?\s*months?\b/.test(text)) return 6;
  if (/\b12\s*-?\s*months?\b|\bannual\b|\byearly\b|\bone year\b/.test(text)) return 12;
  if (/^\d{1,2}$/.test(text)) {
    const months = Number(text);
    if (months >= 1 && months <= 36) return months;
  }
  return null;
}

function proposeTermDates(out: Record<string, string>, rows: readonly MintGeminiRow[]) {
  const effective = parseDecTermDate(
    rawCell(rows, "effective_date", "policy_effective_date", "policy_period_from", "eff_date", "from_date"),
  );
  const expiration = parseDecTermDate(
    rawCell(rows, "expiration_date", "policy_expiration_date", "policy_period_to", "exp_date", "to_date"),
  );
  const spanOk = Boolean(effective && expiration && expiration > effective);
  if (spanOk) {
    put(out, "effectiveDate", effective);
    put(out, "expirationDate", expiration);
  } else {
    if (effective && !expiration) put(out, "effectiveDate", effective);
    if (expiration && !effective) put(out, "expirationDate", expiration);
  }
  const printed = parsePrintedTermMonths(
    rawCell(rows, "term_months", "term_length", "policy_term_length", "policy_term_months"),
  );
  const derived =
    spanOk && effective && expiration
      ? monthsBetweenTermDates(noonUtcFromBusinessDate(effective), noonUtcFromBusinessDate(expiration))
      : null;
  const months = derived ?? printed;
  if (months) put(out, "termMonths", String(months));
}

function coverageMoney(rows: readonly MintGeminiRow[], ...keys: string[]): string {
  const raw = rawCell(rows, ...keys);
  return raw ? formatDecLimit(raw) : "";
}

function proposeHome(rows: readonly MintGeminiRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  proposeTermDates(out, rows);
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
    if (suffix === "usage") return ["vehicle_usage", "vehicle_1_usage", "usage", "use"];
    if (suffix === "annual_miles") return ["annual_miles", "vehicle_1_annual_miles", "vehicle_annual_miles"];
    if (suffix === "lienholder") return ["vehicle_lienholder", "vehicle_1_lienholder", "lienholder"];
    if (suffix === "premium") return ["vehicle_1_premium", "vehicle_premium", "fill_gap_vehicle_1_premium"];
    if (suffix === "comp_deductible") {
      return ["vehicle_1_comp_deductible", "comp_deductible", "comprehensive_deductible", "fill_gap_vehicle_1_comp_deductible"];
    }
    if (suffix === "collision_deductible") {
      return ["vehicle_1_collision_deductible", "collision_deductible", "fill_gap_vehicle_1_collision_deductible"];
    }
    return [`vehicle_${suffix}`, `vehicle_1_${suffix}`];
  }
  if (suffix === "premium") return [`vehicle_${index}_premium`, `fill_gap_vehicle_${index}_premium`];
  if (suffix === "comp_deductible") {
    return [`vehicle_${index}_comp_deductible`, `fill_gap_vehicle_${index}_comp_deductible`];
  }
  if (suffix === "collision_deductible") {
    return [`vehicle_${index}_collision_deductible`, `fill_gap_vehicle_${index}_collision_deductible`];
  }
  if (suffix === "usage") return [`vehicle_${index}_usage`, `vehicle_${index}_use`];
  return [`vehicle_${index}_${suffix}`];
}

function vehicleLienholder(rows: readonly MintGeminiRow[], index: number): string {
  const named = rawCell(rows, ...vehicleSuffix(index, "lienholder"));
  const other =
    index === 1
      ? rawCell(rows, "vehicle_lienholder_other", "vehicle_1_lienholder_other")
      : rawCell(rows, `vehicle_${index}_lienholder_other`);
  if (other && (!named || /^other$/i.test(named))) return other;
  return named;
}

/** PIP rows often print "$1,000 Ded" inside the limit. Keep a deductible when that is all we have. */
function pipDeductibleFromLimit(raw: string): string {
  const match = raw.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*ded\b/i);
  return match ? formatDecDeductible(match[1]!) : "";
}

function formatUmStacked(raw: string): string {
  const low = raw.toLowerCase();
  if (!low) return "";
  if (/non[-\s]?stacked/.test(low)) return "Non-stacked";
  if (/\bstacked\b/.test(low)) return "Stacked";
  return "";
}

function proposeAuto(rows: readonly MintGeminiRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  proposeTermDates(out, rows);
  putAddress(out, "mailing", rawCell(rows, "mailing_address", "contact_mailing_address"));
  const premium = parseMoney(rawCell(rows, "premium", "current_premium"));
  if (premium != null) put(out, "premium", premium.toFixed(2));

  put(out, "liabilityBi", formatDecLimit(rawCell(rows, "liability_bi")));
  put(out, "liabilityBiPremium", formatDecLimit(rawCell(rows, "liability_bi_premium")));
  put(out, "liabilityPd", formatDecLimit(rawCell(rows, "liability_pd")));
  put(out, "liabilityPdPremium", formatDecLimit(rawCell(rows, "liability_pd_premium")));
  put(out, "umUim", formatDecLimit(rawCell(rows, "um_uim")));
  put(out, "umUimPremium", formatDecLimit(rawCell(rows, "um_uim_premium")));
  put(out, "umPd", formatDecLimit(rawCell(rows, "um_pd")));
  put(out, "umPdPremium", formatDecLimit(rawCell(rows, "um_pd_premium")));
  put(
    out,
    "umStacked",
    formatUmStacked(rawCell(rows, "um_stacked")) || formatUmStacked(rawCell(rows, "um_uim")),
  );
  const pipRaw = rawCell(rows, "pip");
  put(out, "pip", formatDecLimit(pipRaw));
  put(
    out,
    "pipDeductible",
    formatDecDeductible(rawCell(rows, "pip_deductible", "fill_gap_pip_deductible")) || pipDeductibleFromLimit(pipRaw),
  );
  put(out, "pipPremium", formatDecLimit(rawCell(rows, "pip_premium")));
  put(out, "medPay", formatDecLimit(rawCell(rows, "med_pay", "fill_gap_med_pay")));
  put(out, "medPayPremium", formatDecLimit(rawCell(rows, "med_pay_premium")));
  put(out, "rental", formatDecLimit(rawCell(rows, "rental", "fill_gap_rental")));
  put(out, "rentalPremium", formatDecLimit(rawCell(rows, "rental_premium")));
  put(out, "towing", formatDecLimit(rawCell(rows, "towing", "ers", "emergency_road_service", "fill_gap_towing")));
  put(out, "towingPremium", formatDecLimit(rawCell(rows, "towing_premium")));
  put(out, "glass", formatDecDeductible(rawCell(rows, "glass", "glass_deductible", "full_glass")));
  put(out, "glassPremium", formatDecLimit(rawCell(rows, "glass_premium")));
  put(out, "discounts", rawCell(rows, "discounts", "fill_gap_discounts"));
  put(
    out,
    "comprehensiveDeductible",
    formatDecDeductible(rawCell(rows, "comp_deductible", "comprehensive_deductible", "comprehensive")),
  );
  put(out, "compPremium", formatDecLimit(rawCell(rows, "comp_premium", "vehicle_1_comp_premium")));
  put(out, "collisionDeductible", formatDecDeductible(rawCell(rows, "collision_deductible")));
  put(out, "collisionPremium", formatDecLimit(rawCell(rows, "collision_premium", "vehicle_1_collision_premium")));

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
    put(out, `${prefix}.annualMiles`, rawCell(rows, ...vehicleSuffix(index, "annual_miles")));
    put(out, `${prefix}.lienholder`, vehicleLienholder(rows, index));
    put(out, `${prefix}.premium`, formatDecLimit(rawCell(rows, ...vehicleSuffix(index, "premium"))));
    put(
      out,
      `${prefix}.comprehensiveDeductible`,
      formatDecDeductible(rawCell(rows, ...vehicleSuffix(index, "comp_deductible"))),
    );
    put(
      out,
      `${prefix}.collisionDeductible`,
      formatDecDeductible(rawCell(rows, ...vehicleSuffix(index, "collision_deductible"))),
    );
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
        formatDecDeductible(
          rawCell(rows, `vehicle_${index}_comp_deductible`, `fill_gap_vehicle_${index}_comp_deductible`),
        ),
      );
      put(
        out,
        `vehicle_${index}_collision`,
        formatDecDeductible(
          rawCell(rows, `vehicle_${index}_collision_deductible`, `fill_gap_vehicle_${index}_collision_deductible`),
        ),
      );
      put(out, `vehicle_${index}_rental`, formatDecLimit(rawCell(rows, `vehicle_${index}_rental`, `fill_gap_vehicle_${index}_rental`)));
      put(out, `vehicle_${index}_towing`, formatDecLimit(rawCell(rows, `vehicle_${index}_towing`, `fill_gap_vehicle_${index}_towing`)));
      put(out, `vehicle_${index}_comp_premium`, formatDecLimit(rawCell(rows, `vehicle_${index}_comp_premium`)));
      put(
        out,
        `vehicle_${index}_collision_premium`,
        formatDecLimit(rawCell(rows, `vehicle_${index}_collision_premium`)),
      );
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
    put(
      out,
      `driver:${identity}.licenseState`,
      rawCell(rows, `driver_${index}_license_state`, `fill_gap_driver_${index}_license_state`),
    );
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
  liability_bi_premium: "liabilityBiPremium",
  liability_pd: "liabilityPd",
  liability_pd_premium: "liabilityPdPremium",
  um_uim: "umUim",
  um_uim_premium: "umUimPremium",
  um_pd: "umPd",
  um_pd_premium: "umPdPremium",
  um_stacked: "umStacked",
  pip: "pip",
  pip_deductible: "pipDeductible",
  pip_premium: "pipPremium",
  med_pay: "medPay",
  med_pay_premium: "medPayPremium",
  rental: "rental",
  rental_premium: "rentalPremium",
  towing: "towing",
  towing_premium: "towingPremium",
  glass: "glass",
  glass_premium: "glassPremium",
  comp_premium: "compPremium",
  collision_premium: "collisionPremium",
  discounts: "discounts",
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
    effectiveDate?: Date | string | null;
    expirationDate?: Date | string | null;
    termMonths?: number | null;
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
    annualMiles?: string | null;
    lienholder?: string | null;
    premium?: string | null;
    comprehensiveDeductible?: string | null;
    collisionDeductible?: string | null;
  }>;
  drivers?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    licenseLast4?: string | null;
    licenseState?: string | null;
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
  put(out, "effectiveDate", businessDateKey(policy?.effectiveDate));
  put(out, "expirationDate", businessDateKey(policy?.expirationDate));
  if (policy?.termMonths != null && Number.isFinite(policy.termMonths) && policy.termMonths > 0) {
    put(out, "termMonths", String(Math.round(policy.termMonths)));
  }
  const premium = policy?.premium ?? input.term?.premium;
  if (premium != null && String(premium).trim()) put(out, "premium", String(premium));
  for (const [limitKey, fieldKey] of Object.entries(LIMIT_KEYS)) {
    put(out, fieldKey, policy?.coverageLimits?.[limitKey]);
  }
  for (const [key, value] of Object.entries(policy?.coverageLimits ?? {})) {
    if (/^vehicle_[2-4]_(comprehensive|collision|rental|towing|comp_premium|collision_premium)$/.test(key)) {
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
    put(out, `${prefix}.annualMiles`, vehicle.annualMiles);
    put(out, `${prefix}.lienholder`, vehicle.lienholder);
    put(out, `${prefix}.premium`, vehicle.premium);
    put(out, `${prefix}.comprehensiveDeductible`, vehicle.comprehensiveDeductible);
    put(out, `${prefix}.collisionDeductible`, vehicle.collisionDeductible);
  }

  for (const driver of input.drivers ?? []) {
    const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ");
    const identity = driverIdentity(name);
    if (!identity) continue;
    put(out, `driver:${identity}.name`, name);
    put(out, `driver:${identity}.dob`, driver.dateOfBirth);
    put(out, `driver:${identity}.license`, driver.licenseLast4);
    put(out, `driver:${identity}.licenseState`, driver.licenseState);
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
  const effectiveDate = take("effectiveDate");
  const expirationDate = take("expirationDate");
  const effective = effectiveDate ? noonUtcFromBusinessDate(effectiveDate) : null;
  const expiration = expirationDate ? noonUtcFromBusinessDate(expirationDate) : null;
  if (effective) {
    patch.policy.effectiveDate = effective;
    patch.term.termEffective = effective;
  }
  if (expiration) {
    patch.policy.expirationDate = expiration;
    patch.term.termExpiration = expiration;
  }
  const termMonths = take("termMonths");
  if (termMonths) {
    const months = Number(termMonths);
    if (Number.isFinite(months) && months > 0) patch.policy.termMonths = Math.round(months);
  }
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
    ["liabilityBiPremium", "liability_bi_premium"],
    ["liabilityPd", "liability_pd"],
    ["liabilityPdPremium", "liability_pd_premium"],
    ["umUim", "um_uim"],
    ["umUimPremium", "um_uim_premium"],
    ["umPd", "um_pd"],
    ["umPdPremium", "um_pd_premium"],
    ["umStacked", "um_stacked"],
    ["pip", "pip"],
    ["pipDeductible", "pip_deductible"],
    ["pipPremium", "pip_premium"],
    ["medPay", "med_pay"],
    ["medPayPremium", "med_pay_premium"],
    ["rental", "rental"],
    ["rentalPremium", "rental_premium"],
    ["towing", "towing"],
    ["towingPremium", "towing_premium"],
    ["glass", "glass"],
    ["glassPremium", "glass_premium"],
    ["compPremium", "comp_premium"],
    ["collisionPremium", "collision_premium"],
    ["discounts", "discounts"],
  ];
  for (const [fieldKey, limitKey] of limitPairs) {
    const value = take(fieldKey);
    if (value) patch.coverageLimits[limitKey] = value;
  }
  for (const key of allowed) {
    if (/^vehicle_[2-4]_(comprehensive|collision|rental|towing|comp_premium|collision_premium)$/.test(key) && proposed[key]) {
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
      /^vehicle:(.+)\.(vin|year|make|model|usage|garagingZip|garagingAddress|annualMiles|lienholder|premium|comprehensiveDeductible|collisionDeductible)$/,
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
    else if (field === "annualMiles") row.annualMiles = value;
    else if (field === "lienholder") row.lienholder = value;
    else if (field === "premium") row.premium = value;
    else if (field === "comprehensiveDeductible") row.comprehensiveDeductible = value;
    else if (field === "collisionDeductible") row.collisionDeductible = value;
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
    const match = key.match(/^driver:(.+)\.(name|dob|license|licenseState)$/);
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
    if (match[2] === "licenseState") row.licenseState = proposed[key];
    drivers.set(identity, row);
  }
  patch.drivers = [...drivers.values()];
  return patch;
}
