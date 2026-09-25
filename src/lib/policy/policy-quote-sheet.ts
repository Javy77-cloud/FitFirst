import { dealProductDef } from "@/lib/deals/deal-products";
import { parseProductInstanceToken } from "@/lib/deals/product-instances";
import { isShopLine, type ShopLine } from "@/lib/domain";

/**
 * Quote-sheet row the policy Overview should read.
 * A second HO3 stores `home~homeowners~88uvyj`, not the first product's `home` line.
 */

export type PolicyQuoteSheetRow = {
  line: string;
  values?: Record<string, { value?: string | null } | undefined> | null;
};

const POLICY_NUMBER_KEYS = [
  "policy_number",
  "current_policy_number",
  "policy_no",
  "pol_number",
  "current_policy_id",
  "policy_id",
] as const;

function sheetText(
  row: PolicyQuoteSheetRow,
  key: string,
): string {
  return String(row.values?.[key]?.value ?? "").trim();
}

function compactPolicyNumber(raw: string | null | undefined): string {
  return String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function shopLineForPolicy(input: {
  sourceProduct?: string | null;
  lineOfBusiness?: string | null;
}): ShopLine | null {
  const instance = parseProductInstanceToken(input.sourceProduct);
  if (instance) return dealProductDef(instance.productId).shopLine;
  const raw = String(input.lineOfBusiness ?? "").trim();
  if (isShopLine(raw)) return raw;
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  if (
    compact === "HO" ||
    compact.startsWith("HO") ||
    compact.startsWith("DP") ||
    compact === "MHO" ||
    compact === "MMHO" ||
    compact === "HOME" ||
    compact === "HOMEOWNERS" ||
    compact === "LANDLORD" ||
    compact === "RENTERS"
  ) {
    return "home";
  }
  if (compact === "AUTO" || compact === "PA") return "auto";
  if (compact === "FLOOD" || compact === "NFIP") return "flood";
  return null;
}

function sheetMatchesPolicyNumber(row: PolicyQuoteSheetRow, wanted: string): boolean {
  if (wanted.length < 4) return false;
  return POLICY_NUMBER_KEYS.some((key) => compactPolicyNumber(sheetText(row, key)) === wanted);
}

export function selectPolicyQuoteSheet<T extends PolicyQuoteSheetRow>(
  sheets: readonly T[],
  input: {
    sourceProduct?: string | null;
    policyNumber?: string | null;
    lineOfBusiness?: string | null;
  },
): T | null {
  if (!sheets.length) return null;
  const instance = parseProductInstanceToken(input.sourceProduct);
  const shopLine = shopLineForPolicy(input);

  if (instance && instance.key !== instance.productId && shopLine) {
    const copyLine = `${shopLine}~${instance.key}`;
    const copy = sheets.find((row) => row.line === copyLine);
    if (copy) return copy;
  }

  const wantedNumber = compactPolicyNumber(input.policyNumber);
  const numbered = sheets.filter((row) => sheetMatchesPolicyNumber(row, wantedNumber));
  if (numbered.length === 1) return numbered[0]!;

  if (instance && shopLine) {
    const explicit = sheets.find((row) => row.line === `${shopLine}~${instance.key}`);
    if (explicit) return explicit;
  }

  if (shopLine) {
    const plain = sheets.find((row) => row.line === shopLine);
    if (plain) return plain;
    const prefixed = sheets.find((row) => row.line.startsWith(`${shopLine}~`));
    if (prefixed) return prefixed;
  }

  return sheets[0] ?? null;
}
