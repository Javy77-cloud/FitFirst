import {
  PAYMENT_STATUSES,
  POLICY_SUB_TYPES,
  POLICY_TYPES,
  policySubTypesFor,
} from "@/lib/commissions/zoho-fields";
import {
  DOCUMENT_CATEGORIES,
  INSURANCE_FAMILIES,
  POLICY_STATUS_OPTIONS,
  POLICY_TERMS_BY_FAMILY,
  type InsuranceFamily,
} from "@/lib/desk/policy-family";
import { policyStatusColor } from "@/lib/desk/status-colors";
import { SELLING_AGENCIES } from "@/lib/domain-ams";

export const GLOBAL_LIST_KEYS = [
  "policy_type",
  "policy_sub_type",
  "policy_term",
  "policy_status",
  "document_category",
  "payment_status",
  "selling_agency",
] as const;

export type GlobalListKey = (typeof GLOBAL_LIST_KEYS)[number];

export const GLOBAL_LIST_LABEL: Record<GlobalListKey, string> = {
  policy_type: "Policy types",
  policy_sub_type: "Policy sub-types",
  policy_term: "Policy terms",
  policy_status: "Policy statuses",
  document_category: "File categories",
  payment_status: "Payment statuses",
  selling_agency: "Selling agencies",
};

export type GlobalListSeed = {
  listKey: GlobalListKey;
  family: InsuranceFamily | null;
  parentSlug: string | null;
  slug: string;
  label: string;
  sortOrder: number;
  color: string | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function familyForPolicyType(type: string): InsuranceFamily | null {
  if (type === "Life") return "Life";
  if (type === "Health") return "Health";
  return "P&C";
}

function familyForSubType(sub: string): InsuranceFamily {
  if (policySubTypesFor("Life", "Life").includes(sub)) return "Life";
  if (policySubTypesFor("Health", "Health").includes(sub)) return "Health";
  return "P&C";
}

/** Zoho-style picklists the Settings hub and Policy form share. */
export function defaultGlobalLists(): GlobalListSeed[] {
  const rows: GlobalListSeed[] = [];

  POLICY_TYPES.forEach((label, index) => {
    rows.push({
      listKey: "policy_type",
      family: familyForPolicyType(label),
      parentSlug: null,
      slug: slugify(label),
      label,
      sortOrder: index,
      color: null,
    });
  });

  POLICY_SUB_TYPES.forEach((label, index) => {
    const family = familyForSubType(label);
    rows.push({
      listKey: "policy_sub_type",
      family,
      parentSlug: null,
      slug: slugify(label),
      label,
      sortOrder: index,
      color: null,
    });
  });

  for (const family of INSURANCE_FAMILIES) {
    POLICY_TERMS_BY_FAMILY[family].forEach((label, index) => {
      rows.push({
        listKey: "policy_term",
        family,
        parentSlug: null,
        slug: `${slugify(family)}-${slugify(label)}`,
        label,
        sortOrder: index,
        color: null,
      });
    });
  }

  POLICY_STATUS_OPTIONS.forEach((option, index) => {
    rows.push({
      listKey: "policy_status",
      family: null,
      parentSlug: null,
      slug: option.value,
      label: option.label,
      sortOrder: index,
      color: policyStatusColor(option.value),
    });
  });

  DOCUMENT_CATEGORIES.forEach((option, index) => {
    rows.push({
      listKey: "document_category",
      family: null,
      parentSlug: null,
      slug: option.value,
      label: option.label,
      sortOrder: index,
      color: null,
    });
  });

  PAYMENT_STATUSES.forEach((label, index) => {
    rows.push({
      listKey: "payment_status",
      family: null,
      parentSlug: null,
      slug: slugify(label),
      label,
      sortOrder: index,
      color: null,
    });
  });


  SELLING_AGENCIES.forEach((label, index) => {
    rows.push({
      listKey: "selling_agency",
      family: null,
      parentSlug: null,
      slug: slugify(label),
      label,
      sortOrder: index,
      color: null,
    });
  });

  return rows;
}

export function listsForFamily<T extends { family: string | null; listKey: string; label: string; active?: boolean }>(
  rows: T[],
  listKey: GlobalListKey,
  family?: InsuranceFamily | null,
): T[] {
  return rows
    .filter((row) => row.listKey === listKey)
    .filter((row) => row.active !== false)
    .filter((row) => {
      if (!family) return true;
      if (!row.family) return true;
      return row.family === family;
    });
}
