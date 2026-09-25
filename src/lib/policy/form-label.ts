import { policyProductDisplayLabel } from "@/lib/policy/eo";
import { homeLineKey, homeLineLabel } from "@/lib/home/lines";

/**
 * Visible product tag on policy names, list chips, and headers.
 * A known form code wins over the generic line "Home".
 * A real product name (General Liability, Term Life) stays when no form is known.
 */

const EMPTY = /^(undefined|null|none|n\/a|na|—|-)$/i;

/** Line stand-ins. These are not a policy form. */
const GENERIC_LINE = /^(home|homeowners?|ho|dwelling|property|commercial|p&c|pc)$/i;

export type PolicyFormLabelInput = {
  formType?: string | null;
  policySubType?: string | null;
  policyType?: string | null;
  lineOfBusiness?: string | null;
  /** policyRecordName still calls this subType. */
  subType?: string | null;
};

function clean(raw: string | null | undefined): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text || EMPTY.test(text)) return "";
  return text;
}

/** HO3, DP1, HO6, MHO, Auto, WC, Flood, E&O. Null when the text is not a form code. */
export function policyFormCode(raw: string | null | undefined): string | null {
  const text = clean(raw);
  if (!text) return null;
  if (policyProductDisplayLabel(text) === "E&O") return "E&O";
  const upper = text.toUpperCase();
  const ho = upper.match(/\bHO\s*-?\s*([0-8])\b/);
  if (ho) return `HO${ho[1]}`;
  const dp = upper.match(/\bDP\s*-?\s*([13])\b/);
  if (dp) return `DP${dp[1]}`;
  if (
    /\bMHO\b/.test(upper) ||
    /^(HMO|MH|MMHO|MH3|MOBILE HOME|MANUFACTURED HOME)$/.test(upper)
  ) {
    return "MHO";
  }
  if (/^(WC|WORKERS?\s*'?\s*COMP(?:ENSATION)?|WORKERS_COMP)$/.test(upper)) return "WC";
  if (/^(PA|AUTO|PERSONAL AUTO|PERSONAL AUTOMOBILE)$/.test(upper)) return "Auto";
  if (upper === "FLOOD") return "Flood";
  return null;
}

function firstFormCode(input: PolicyFormLabelInput): string | null {
  const sub = input.policySubType ?? input.subType;
  for (const value of [input.formType, sub, input.policyType, input.lineOfBusiness]) {
    const code = policyFormCode(value);
    if (code) return code;
  }
  return null;
}

function specificProduct(input: PolicyFormLabelInput): string {
  const sub = input.policySubType ?? input.subType;
  for (const value of [sub, input.formType, input.policyType]) {
    const text = clean(value);
    if (!text || GENERIC_LINE.test(text) || policyFormCode(text)) continue;
    return policyProductDisplayLabel(text);
  }
  return "";
}

function genericLine(input: PolicyFormLabelInput): string {
  const sub = input.policySubType ?? input.subType;
  for (const value of [input.policyType, input.formType, sub, input.lineOfBusiness]) {
    const text = clean(value);
    if (!text) continue;
    if (/^WC$|workers/i.test(text)) return "WC";
    if (GENERIC_LINE.test(text) || homeLineKey(text)) {
      const label = homeLineLabel(text);
      return label || policyProductDisplayLabel(text);
    }
  }
  return "";
}

/**
 * Form chip. Empty when the only label is the generic line (Home, Commercial).
 * General Liability, Term Life, and other real product names still show.
 */
export function policyFormChipLabel(input: PolicyFormLabelInput): string {
  return firstFormCode(input) || specificProduct(input);
}

/** Policy-name product slot. Form code, else the real product, else Home / Auto / Commercial. */
export function policyFormProductLabel(input: PolicyFormLabelInput): string {
  return policyFormChipLabel(input) || genericLine(input);
}

/** Product tag shown next to a line name. Hidden when it only repeats that line. */
export function policyFormBesideLine(lineLabel: string, input: PolicyFormLabelInput): string {
  const product = policyFormChipLabel(input);
  if (!product) return "";
  if (product.toLowerCase() === lineLabel.trim().toLowerCase()) return "";
  return product;
}
