import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";
import type { SheetProduct } from "./products";
import { isSheetFormMetaKey, submittedSheetValues } from "./save-values";

export type ExtractedInput = {
  fieldKey: string;
  normalizedValue: string;
  sourceLabel?: string;
  sourceDocTag?: string;
  blankAfterMatch?: boolean;
};

export type PublicFact = {
  fieldKey: string;
  value: string;
  sourceLabel: string;
  /** Rejected for Coverage A — Zestimate / list price never become Cov A. */
  kind?: "listing" | "county" | "permit" | "fema" | "zestimate" | "list_price";
};

export type ApplyFillResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

export function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export function isJavyTestedCoverageA(field?: QuoteSheetFieldValue | null): boolean {
  return field?.source === "javy";
}

/** Javy-tested Cov A is confirmed seed — never CHECK, never overwritten. */
export function neverCheckCoverageA(fieldKey: string, existing?: QuoteSheetFieldValue | null): boolean {
  if (fieldKey !== "coverage_a") return false;
  return existing?.source === "javy";
}

/** Public-records gap-fill loses to a value read from the dec / photo. */
export function isPublicRecordsSource(field?: QuoteSheetFieldValue | null): boolean {
  return field?.source === "public" || field?.source === "public-records";
}

function cellSourceDocument(item: Pick<ExtractedInput, "sourceLabel" | "sourceDocTag">, source: string): string {
  return item.sourceLabel || item.sourceDocTag || (source === "photo-ocr" ? "Photo" : "dec page");
}

/** Desk label for a cell source — dec/photo beat public records. */
export function sourceTag(cell: QuoteSheetFieldValue): string | null {
  if (cell.source === "javy") return "Javy-tested";
  if (cell.sourceLabel) return cell.sourceLabel;
  if (!cell.value.trim() && cell.status === "missing") return null;
  if (cell.source === "photo-ocr") {
    return cell.status === "check" ? "CHECK · photo-OCR" : "photo-OCR";
  }
  if (cell.source === "extracted") {
    return cell.status === "check" ? "CHECK · dec page" : "dec page";
  }
  if (cell.source === "public" || cell.source === "public-records") {
    return cell.status === "check" ? "CHECK · public" : "public";
  }
  if (cell.status === "check") return "CHECK";
  return null;
}

export type ApplyFillOptions = {
  source?: QuoteSheetFieldValue["source"];
};

export function applyExtractedToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  extracted: ExtractedInput[],
  options?: ApplyFillOptions,
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const source = options?.source ?? "extracted";

  for (const item of extracted) {
    const key = extractKeyToSheetKey(line, item.fieldKey);
    if (!key) continue;
    const current = values[key];
    if (neverCheckCoverageA(key, current)) {
      skippedKeys.push(key);
      continue;
    }
    if (!fieldIsBlank(current) && !isPublicRecordsSource(current)) {
      skippedKeys.push(key);
      continue;
    }
    const nextValue = String(item.normalizedValue ?? "").trim();
    const sourceLabel = cellSourceDocument(item, source);
    if (!nextValue) {
      if (item.blankAfterMatch && fieldIsBlank(current)) {
        values[key] = { value: "", status: "missing", source: "blank", sourceLabel };
      }
      continue;
    }
    values[key] = {
      value: nextValue,
      status: "check",
      source,
      sourceLabel,
    };
    filledKeys.push(key);
  }

  if (fieldIsBlank(values.applicant_name) && values.named_insured?.value?.trim()) {
    values.applicant_name = { ...values.named_insured };
    filledKeys.push("applicant_name");
  }
  if (fieldIsBlank(values.applicant_address) && values.mailing_address?.value?.trim()) {
    values.applicant_address = { ...values.mailing_address };
    filledKeys.push("applicant_address");
  }

  return { values, filledKeys, skippedKeys };
}

/** Gap-fill blanks from public records. Uploaded dec / agent / Javy always win. */
export function applyPublicToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  facts: PublicFact[],
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const fact of facts) {
    const key = extractKeyToSheetKey(line, fact.fieldKey);
    if (!key) continue;
    if (key === "coverage_a" || fact.kind === "zestimate" || fact.kind === "list_price") {
      skippedKeys.push(key);
      continue;
    }
    if (isBlockedPublicKey(key)) {
      skippedKeys.push(key);
      continue;
    }
    const current = values[key];
    if (neverCheckCoverageA(key, current) || !fieldIsBlank(current)) {
      skippedKeys.push(key);
      continue;
    }
    const nextValue = String(fact.value ?? "").trim();
    if (!nextValue) continue;
    values[key] = {
      value: nextValue,
      status: "check",
      source: "public",
      sourceLabel: fact.sourceLabel,
    };
    filledKeys.push(key);
  }

  return { values, filledKeys, skippedKeys };
}

function isBlockedPublicKey(key: string): boolean {
  return /ssn|claim|social/.test(key);
}

export type DealHeaderGlance = {
  coverageAmount: number | null;
  propertyOneliner: string | null;
  currentCarrier: string | null;
  primaryNamedInsured?: string | null;
  secondaryNamedInsured?: string | null;
};

export function headerIsBlank(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return value.trim() === "";
}

export function propertyOnelinerFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): string | null {
  const rawStreet = values.address1?.value?.trim() ?? "";
  if (!rawStreet) return null;
  const city = values.city?.value?.trim() ?? "";
  const state = values.state?.value?.trim() ?? "";
  const zip = values.zip?.value?.trim() ?? "";
  const year = values.year_built?.value?.trim() ?? "";
  const construction = values.construction?.value?.trim() ?? "";
  const street =
    city && rawStreet.toLowerCase().includes(city.toLowerCase())
      ? rawStreet.split(",")[0].trim()
      : rawStreet;
  const locality = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const head = locality ? `${street}, ${locality}` : street;
  const tail = [year, construction].filter(Boolean).join(" ");
  return tail ? `${head} · ${tail}` : head;
}

export function coverageAmountFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): number | null {
  const raw = values.coverage_a?.value?.replace(/[, $]/g, "") ?? "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Copy matching glance fields onto deal header BLANKS only. Never overwrite typed values. */
export function fillDealHeaderBlanks(
  header: DealHeaderGlance,
  values: Record<string, QuoteSheetFieldValue>,
): DealHeaderGlance {
  const next: DealHeaderGlance = { ...header };
  const covA = coverageAmountFromSheet(values);
  if (headerIsBlank(header.coverageAmount) && covA != null) {
    next.coverageAmount = covA;
  }
  const oneliner = propertyOnelinerFromSheet(values);
  if (headerIsBlank(header.propertyOneliner) && oneliner) {
    next.propertyOneliner = oneliner;
  }
  const carrier = values.current_carrier?.value?.trim() ?? "";
  if (headerIsBlank(header.currentCarrier) && carrier) {
    next.currentCarrier = carrier;
  }
  const named = values.named_insured?.value?.trim() ?? "";
  if (headerIsBlank(header.primaryNamedInsured) && named) {
    next.primaryNamedInsured = named;
  }
  return next;
}

export type ContactBlanks = {
  firstName: string;
  lastName: string;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

const PLACEHOLDER_NAMES = new Set(["bound", "client", "unknown", "lead"]);

export function splitNamedInsured(raw: string): { firstName: string; lastName: string } | null {
  const parts = raw.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function isPlaceholderName(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return !v || PLACEHOLDER_NAMES.has(v);
}

/** Bind: copy matching sheet values onto Contact blanks. Never invent SSN, DOB, or claims. */
export function fillContactBlanksFromSheet(
  contact: ContactBlanks,
  values: Record<string, QuoteSheetFieldValue>,
): ContactBlanks {
  const next: ContactBlanks = { ...contact };
  const named = splitNamedInsured(values.named_insured?.value?.trim() ?? "");
  if (named && isPlaceholderName(contact.firstName)) next.firstName = named.firstName;
  if (named && isPlaceholderName(contact.lastName)) next.lastName = named.lastName;
  const street = values.address1?.value?.trim() ?? "";
  if (headerIsBlank(contact.mailingAddress) && street) next.mailingAddress = street;
  const city = values.city?.value?.trim() ?? "";
  if (headerIsBlank(contact.city) && city) next.city = city;
  const state = values.state?.value?.trim() ?? "";
  if (headerIsBlank(contact.state) && state) next.state = state;
  const zip = values.zip?.value?.trim() ?? "";
  if (headerIsBlank(contact.zip) && zip) next.zip = zip;
  return next;
}

export type PolicyBlanks = {
  policyNumber: string | null;
  coverageA: number | null;
  premium: number | null;
  effectiveDate: string | null;
  expirationDate: string | null;
};

function moneyFromSheet(raw: string): number | null {
  const n = Number(raw.replace(/[, $]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Bind: copy matching sheet values onto Policy blanks. Never use Zestimate as Cov A. */
export function fillPolicyBlanksFromSheet(
  policy: PolicyBlanks,
  values: Record<string, QuoteSheetFieldValue>,
  opts?: { coverageASource?: string | null },
): PolicyBlanks {
  const next: PolicyBlanks = { ...policy };
  const number = values.policy_number?.value?.trim() ?? "";
  if (headerIsBlank(policy.policyNumber) && number) next.policyNumber = number;
  const covA = coverageAmountFromSheet(values);
  const covSource = opts?.coverageASource ?? values.coverage_a?.source ?? "";
  if (
    headerIsBlank(policy.coverageA) &&
    covA != null &&
    covSource !== "public" &&
    values.coverage_a?.sourceLabel?.toLowerCase().includes("zestimate") !== true
  ) {
    next.coverageA = covA;
  }
  const premium = moneyFromSheet(values.current_premium?.value?.trim() ?? "");
  if (headerIsBlank(policy.premium) && premium != null) next.premium = premium;
  const effective = values.effective_date?.value?.trim() ?? "";
  if (headerIsBlank(policy.effectiveDate) && effective) next.effectiveDate = effective;
  const expiration = values.expiration_date?.value?.trim() ?? "";
  if (headerIsBlank(policy.expirationDate) && expiration) next.expirationDate = expiration;
  return next;
}

export function parseSheetDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mergeAgentEdits(
  existing: Record<string, QuoteSheetFieldValue>,
  submitted: Record<string, string>,
  line: ShopLine,
  product?: SheetProduct,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...existing };

  function writeCell(key: string, raw: string) {
    const typed = String(raw ?? "").trim();
    const current = next[key];
    if (neverCheckCoverageA(key, current) && typed === (current?.value ?? "")) {
      next[key] = {
        value: current?.value ?? typed,
        status: "confirmed",
        source: "javy",
      };
      return;
    }
    if (typed === "") {
      next[key] = { value: "", status: "missing", source: "blank" };
      return;
    }
    const unchangedCheck =
      current?.status === "check" &&
      current.value === typed &&
      (current.source === "extracted" || current.source === "photo-ocr");
    if (unchangedCheck) {
      next[key] = current;
      return;
    }
    next[key] = { value: typed, status: "confirmed", source: "agent" };
  }

  const catalog = new Set(fieldsForLine(line, product).map((field) => field.key));
  for (const fieldKey of catalog) {
    if (!(fieldKey in submitted)) continue;
    writeCell(fieldKey, submitted[fieldKey]);
  }
  for (const [key, raw] of Object.entries(submitted)) {
    if (isSheetFormMetaKey(key) || catalog.has(key)) continue;
    writeCell(key, raw);
  }
  return next;
}

export { submittedSheetValues };

export function confirmField(
  existing: Record<string, QuoteSheetFieldValue>,
  fieldKey: string,
): Record<string, QuoteSheetFieldValue> {
  const current = existing[fieldKey];
  if (!current || fieldIsBlank(current)) return existing;
  if (current.source === "javy") {
    return {
      ...existing,
      [fieldKey]: { ...current, status: "confirmed", source: "javy" },
    };
  }
  return {
    ...existing,
    [fieldKey]: {
      ...current,
      status: "confirmed",
      source:
        current.source === "extracted" || current.source === "photo-ocr"
          ? "agent"
          : current.source,
    },
  };
}

export function sheetCounts(values: Record<string, QuoteSheetFieldValue>): {
  missing: number;
  check: number;
  confirmed: number;
} {
  let missing = 0;
  let check = 0;
  let confirmed = 0;
  for (const field of Object.values(values)) {
    if (field.status === "check") check += 1;
    else if (field.status === "confirmed" && field.value.trim()) confirmed += 1;
    else missing += 1;
  }
  return { missing, check, confirmed };
}
