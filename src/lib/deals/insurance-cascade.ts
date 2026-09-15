import { QUOTING_FORMS, type QuotingFormId } from "@/lib/domain";
import { coerceQuotingFormId, quotingFormById } from "@/lib/quoting/forms";
import {
  defaultFormForPackageLine,
  isCommercialPackageLine,
  isPcPackageLine,
  type PackageLine,
} from "@/lib/deals/package-lines";

/** Pipeline family for Deal Details cascade (not the board slug alone). */
export type PipelineFamily = "pc" | "life" | "health";

/** Top-level Insurance Type — Javy locked: PC / Life / Health only. */
export type InsuranceTypeId = "pc" | "life" | "health";

export type InsuranceTypeOption = { id: InsuranceTypeId; label: string };

/**
 * Middle cascade level — product category under Type.
 * Restored from sep7gv/sep7gw PC_TYPES (was wrongly collapsed into Type when Type locked to PC/Life/Health).
 */
export type InsuranceCategoryId =
  | "home"
  | "renter_landlord"
  | "auto"
  | "rec"
  | "flood"
  | "umbrella"
  | "commercial"
  | "life"
  | "health";

export type InsuranceCategoryOption = { id: InsuranceCategoryId; label: string };

export type PolicySubtypeOption = {
  /** Stored quotingForm id for P&C, or life/health option label. */
  id: string;
  label: string;
};

/** Exact Insurance Type picklist labels (prefer "PC" over "P&C"). */
export const INSURANCE_TYPE_OPTIONS: InsuranceTypeOption[] = [
  { id: "pc", label: "PC" },
  { id: "life", label: "Life" },
  { id: "health", label: "Health" },
];

/** Middle menu under PC — Home / Auto / … (not product forms). */
export const PC_CATEGORY_OPTIONS: InsuranceCategoryOption[] = [
  { id: "home", label: "Home" },
  { id: "renter_landlord", label: "Renter/Landlord" },
  { id: "auto", label: "Auto" },
  { id: "rec", label: "Recreational Vehicles" },
  { id: "flood", label: "Flood" },
  { id: "umbrella", label: "Umbrella" },
  { id: "commercial", label: "Commercial" },
];

const FORM_CATEGORY: Record<QuotingFormId, Exclude<InsuranceCategoryId, "life" | "health">> = {
  HO3: "home",
  HO5: "home",
  HO6: "home",
  HO8: "home",
  MHO: "home",
  MDP: "renter_landlord",
  DP1: "renter_landlord",
  DP3: "renter_landlord",
  HO4: "renter_landlord",
  PA: "auto",
  MOTORCYCLE: "auto",
  RV: "rec",
  BOAT: "rec",
  UMBRELLA: "umbrella",
  FLOOD: "flood",
  GL: "commercial",
  WC: "commercial",
  BOP: "commercial",
  CA: "commercial",
};

const CATEGORY_FORMS: Record<Exclude<InsuranceCategoryId, "life" | "health">, QuotingFormId[]> = {
  home: ["HO3", "HO5", "HO6", "HO8", "MHO"],
  renter_landlord: ["HO4", "DP1", "DP3", "MDP"],
  auto: ["PA", "MOTORCYCLE"],
  rec: ["RV", "BOAT"],
  flood: ["FLOOD"],
  umbrella: ["UMBRELLA"],
  commercial: ["GL", "WC", "BOP", "CA"],
};

export function pipelineFamilyFromDeal(input: {
  pipelineSlug?: string | null;
  lineOfBusiness?: string | null;
}): PipelineFamily {
  const slug = (input.pipelineSlug ?? "").trim().toLowerCase();
  if (slug === "life" || slug.startsWith("life")) return "life";
  if (slug === "health" || slug.startsWith("health")) return "health";
  const lob = (input.lineOfBusiness ?? "").trim().toUpperCase();
  if (lob === "LIFE") return "life";
  if (lob === "HEALTH") return "health";
  return "pc";
}

/** Top-level Type options. Family arg kept for call-sites; always PC/Life/Health. */
export function insuranceTypesForFamily(_family?: PipelineFamily): InsuranceTypeOption[] {
  return [...INSURANCE_TYPE_OPTIONS];
}

export function insuranceTypeForQuotingForm(formId: string | null | undefined): InsuranceTypeId | null {
  const id = coerceQuotingFormId(formId);
  if (!id) return null;
  return FORM_CATEGORY[id] ? "pc" : null;
}

export function insuranceCategoryForQuotingForm(
  formId: string | null | undefined,
): Exclude<InsuranceCategoryId, "life" | "health"> | null {
  const id = coerceQuotingFormId(formId);
  if (!id) return null;
  return FORM_CATEGORY[id] ?? null;
}

/** Middle categories under a Type. Life/Health use desk subfilter options. */
export function categoriesForType(
  typeId: InsuranceTypeId | "",
  lifeHealthOptions: Array<{ slug?: string; label: string }> = [],
): Array<{ id: string; label: string }> {
  if (typeId === "pc") return [...PC_CATEGORY_OPTIONS];
  if (typeId === "life" || typeId === "health") {
    return lifeHealthOptions.map((option, index) => ({
      id: `${typeId}__${slugCategory(option.slug || option.label || String(index))}`,
      label: option.label,
    }));
  }
  return [];
}

function slugCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "option";
}

/** Product/form options under a middle category. */
export function formsForCategory(
  typeId: InsuranceTypeId | "",
  categoryId: string,
  lifeHealthOptions: Array<{ slug?: string; label: string }> = [],
): PolicySubtypeOption[] {
  if (!typeId || !categoryId) return [];
  if (typeId === "life" || typeId === "health") {
    const wanted = categoryId.includes("__")
      ? categoryId.slice(categoryId.indexOf("__") + 2)
      : categoryId;
    const hit = lifeHealthOptions.find((option) => {
      const slug = slugCategory(option.slug || option.label);
      return (
        slug === wanted ||
        option.label.toLowerCase() === wanted.toLowerCase() ||
        option.label === categoryId
      );
    });
    if (hit) return [{ id: hit.label, label: hit.label }];
    return lifeHealthOptions.map((option) => ({ id: option.label, label: option.label }));
  }
  const forms =
    CATEGORY_FORMS[categoryId as Exclude<InsuranceCategoryId, "life" | "health">] ?? [];
  return forms.map((formId) => {
    const form = quotingFormById(formId)!;
    return { id: form.id, label: form.label };
  });
}

/**
 * @deprecated Prefer formsForCategory. Kept for call-sites that still pass Type only
 * (returns all forms under Type — flat list).
 */
export function policySubtypesForType(
  family: PipelineFamily,
  typeId: InsuranceTypeId,
  lifeHealthOptions: Array<{ slug?: string; label: string }> = [],
): PolicySubtypeOption[] {
  const effective: InsuranceTypeId =
    typeId || (family === "life" ? "life" : family === "health" ? "health" : "pc");
  if (effective === "life" || effective === "health") {
    return lifeHealthOptions.map((option) => ({
      id: option.label,
      label: option.label,
    }));
  }
  return QUOTING_FORMS.map((form) => ({
    id: form.id,
    label: form.label,
  }));
}

export function allPcCategoryLabels(): string[] {
  return PC_CATEGORY_OPTIONS.map((row) => row.label);
}

/** Resolve cascade defaults from the deal's current quoting form / subtype / category. */
export function cascadeFromDeal(input: {
  family: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  categoryValue?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
}): {
  typeId: InsuranceTypeId;
  categoryId: string;
  subtypeId: string;
  subtypeLabel: string;
} {
  const options = input.lifeHealthOptions ?? [];
  if (input.family === "life" || input.family === "health") {
    const typeId: InsuranceTypeId = input.family === "life" ? "life" : "health";
    const cats = categoriesForType(typeId, options);
    const wantedCat = (input.categoryValue ?? input.policySubType ?? "").trim();
    const catHit =
      cats.find(
        (c) =>
          c.label.toLowerCase() === wantedCat.toLowerCase() ||
          c.id === wantedCat ||
          c.id.endsWith(`__${slugCategory(wantedCat)}`),
      ) ?? cats[0];
    const forms = formsForCategory(typeId, catHit?.id ?? "", options);
    const wantedForm = (input.policySubType ?? "").trim();
    const formHit =
      forms.find((s) => s.label.toLowerCase() === wantedForm.toLowerCase()) ?? forms[0];
    return {
      typeId,
      categoryId: catHit?.id ?? "",
      subtypeId: formHit?.id ?? wantedForm,
      subtypeLabel: formHit?.label ?? wantedForm,
    };
  }

  const typeId: InsuranceTypeId = "pc";
  const fromForm = insuranceCategoryForQuotingForm(input.quotingForm);
  const fromLabel = categoryIdFromLabel(input.categoryValue);
  const categoryId = fromForm ?? fromLabel ?? "home";
  const forms = formsForCategory("pc", categoryId);
  const formId =
    coerceQuotingFormId(input.quotingForm) ?? (forms[0]?.id as QuotingFormId | undefined);
  const form = formId ? quotingFormById(formId) : null;
  const hit = forms.find((s) => s.id === form?.id) ?? forms[0];
  return {
    typeId,
    categoryId,
    subtypeId: hit?.id ?? "HO3",
    subtypeLabel: hit?.label ?? "HO3",
  };
}

/** Package deals keep Type=PC and store multiple shop lines; Form stays per-line. */
export function categoryForPackageLine(line: PackageLine): Exclude<InsuranceCategoryId, "life" | "health"> {
  if (isCommercialPackageLine(line)) return "commercial";
  if (line === "auto") return "auto";
  if (line === "flood") return "flood";
  return "home";
}

export function cascadeFromPackageLine(input: {
  line: PackageLine;
  quotingForm?: string | null;
}): {
  typeId: InsuranceTypeId;
  categoryId: string;
  subtypeId: string;
  subtypeLabel: string;
} {
  const categoryId = categoryForPackageLine(input.line);
  return cascadeFromDeal({
    family: "pc",
    quotingForm: input.quotingForm || defaultFormForPackageLine(input.line),
    categoryValue:
      isCommercialPackageLine(input.line)
        ? "commercial"
        : isPcPackageLine(input.line) && input.line !== "home"
          ? input.line
          : categoryId,
  });
}

export function categoryIdFromLabel(raw: string | null | undefined): InsuranceCategoryId | "" {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return "";
  if (
    v === "home" ||
    v.includes("homeowner") ||
    v === "ho8" ||
    v === "mh" ||
    v === "mho" ||
    v.includes("manufactured") ||
    (v.includes("mobile home") && !v.includes("dwelling") && !v.includes("renter"))
  ) {
    return "home";
  }
  if (
    v.includes("renter") ||
    v.includes("landlord") ||
    v === "dp1" ||
    v === "dp3" ||
    v === "ho4" ||
    v === "mdp" ||
    v.includes("dwelling fire")
  ) {
    return "renter_landlord";
  }
  if (v === "auto" || v.includes("personal auto") || v.includes("motorcycle")) return "auto";
  if (v.includes("rec") || v.includes("rv") || v.includes("boat") || v.includes("watercraft")) return "rec";
  if (v === "flood") return "flood";
  if (v === "umbrella") return "umbrella";
  if (
    v === "commercial" ||
    v === "gl" ||
    v === "wc" ||
    v === "bop" ||
    v === "ca" ||
    v.includes("commercial auto") ||
    v.includes("liability") ||
    v.includes("workers")
  ) {
    return "commercial";
  }
  const hit = PC_CATEGORY_OPTIONS.find((row) => row.label.toLowerCase() === v || row.id === v);
  return hit?.id ?? "";
}

/** All P&C subtype labels (for field-builder catalog seed). */
export function allPcSubtypeLabels(): string[] {
  return QUOTING_FORMS.map((form) => form.label);
}

/** Deals-list Pipeline column — Javy's standing prefs key (not canonical `pipeline`). */
export const DEAL_LIST_PIPELINE_KEY = "picklist_5n3i";
/** Deals-list Insurance subtype column — standing prefs key (not Details `insurance_subtype`). */
export const DEAL_LIST_SUBTYPE_KEY = "picklist";

/**
 * Map cascade Insurance Type (PC / Life / Health) onto the list Pipeline picklist.
 * `picklist_5n3i` options are P&C / Life / Health (colored pills) — PC → P&C.
 */
export function pipelineListLabelFromType(type: string | null | undefined): string {
  const v = (type ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  if (lower === "pc" || lower === "p&c" || lower === "p-c" || lower.includes("propert")) return "P&C";
  if (lower === "life" || lower.startsWith("life")) return "Life";
  if (lower === "health" || lower.startsWith("health")) return "Health";
  return v;
}

/** Deepest form / subtype human label for the list Insurance subtype column. */
export function subtypeListLabelFromForm(input: {
  insuranceSubtype?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): string {
  const raw = (input.insuranceSubtype || input.policySubType || input.quotingForm || "").trim();
  if (!raw) return "";
  const formId = coerceQuotingFormId(raw);
  if (formId) {
    const form = quotingFormById(formId);
    return form?.label ?? formId;
  }
  return raw;
}

/** Extra custom keys written on Details save / convert so list columns auto-fill. */
export function dealListCascadeSyncValues(input: {
  insuranceType?: string | null;
  insuranceSubtype?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const pipeline = pipelineListLabelFromType(input.insuranceType);
  if (pipeline) out[DEAL_LIST_PIPELINE_KEY] = pipeline;
  const subtype = subtypeListLabelFromForm(input);
  if (subtype) out[DEAL_LIST_SUBTYPE_KEY] = subtype;
  return out;
}

export function mergeDealListCascadeSync(
  values: Record<string, string>,
  extra?: {
    quotingForm?: string | null;
    policySubType?: string | null;
  },
): Record<string, string> {
  return {
    ...values,
    ...dealListCascadeSyncValues({
      insuranceType: values.insurance_type,
      insuranceSubtype: values.insurance_subtype,
      quotingForm: extra?.quotingForm,
      policySubType: extra?.policySubType ?? values.insurance_subtype,
    }),
  };
}

