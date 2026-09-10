import { QUOTING_FORMS, type QuotingFormId } from "@/lib/domain";
import { coerceQuotingFormId, quotingFormById } from "@/lib/quoting/forms";

/** Pipeline family for Deal Details cascade (not the board slug alone). */
export type PipelineFamily = "pc" | "life" | "health";

export type InsuranceTypeId =
  | "home"
  | "auto"
  | "rec"
  | "flood"
  | "umbrella"
  | "commercial"
  | "life"
  | "health";

export type InsuranceTypeOption = { id: InsuranceTypeId; label: string };

export type PolicySubtypeOption = {
  /** Stored quotingForm id for P&C, or life/health option label. */
  id: string;
  label: string;
};

const PC_TYPES: InsuranceTypeOption[] = [
  { id: "home", label: "Home" },
  { id: "auto", label: "Auto" },
  { id: "rec", label: "Rec / RV" },
  { id: "flood", label: "Flood" },
  { id: "umbrella", label: "Umbrella" },
  { id: "commercial", label: "Commercial" },
];

const FORM_TYPE: Record<QuotingFormId, InsuranceTypeId> = {
  HO3: "home",
  HO5: "home",
  HO6: "home",
  DP1: "home",
  DP3: "home",
  PA: "auto",
  RV: "rec",
  UMBRELLA: "umbrella",
  FLOOD: "flood",
  GL: "commercial",
  WC: "commercial",
  BOP: "commercial",
};

const TYPE_FORMS: Record<Exclude<InsuranceTypeId, "life" | "health">, QuotingFormId[]> = {
  home: ["HO3", "HO5", "HO6", "DP1", "DP3"],
  auto: ["PA"],
  rec: ["RV"],
  flood: ["FLOOD"],
  umbrella: ["UMBRELLA"],
  commercial: ["GL", "WC", "BOP"],
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

export function insuranceTypesForFamily(family: PipelineFamily): InsuranceTypeOption[] {
  if (family === "life") return [{ id: "life", label: "Life" }];
  if (family === "health") return [{ id: "health", label: "Health" }];
  return PC_TYPES;
}

export function insuranceTypeForQuotingForm(formId: string | null | undefined): InsuranceTypeId | null {
  const id = coerceQuotingFormId(formId);
  if (!id) return null;
  return FORM_TYPE[id] ?? null;
}

export function policySubtypesForType(
  family: PipelineFamily,
  typeId: InsuranceTypeId,
  lifeHealthOptions: Array<{ slug?: string; label: string }> = [],
): PolicySubtypeOption[] {
  if (family === "life" || typeId === "life") {
    return lifeHealthOptions.map((option) => ({
      id: option.label,
      label: option.label,
    }));
  }
  if (family === "health" || typeId === "health") {
    return lifeHealthOptions.map((option) => ({
      id: option.label,
      label: option.label,
    }));
  }
  const forms = TYPE_FORMS[typeId as Exclude<InsuranceTypeId, "life" | "health">] ?? [];
  return forms.map((formId) => {
    const form = quotingFormById(formId)!;
    return { id: form.id, label: form.label };
  });
}

/** Resolve cascade defaults from the deal's current quoting form / subtype. */
export function cascadeFromDeal(input: {
  family: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
}): { typeId: InsuranceTypeId; subtypeId: string; subtypeLabel: string } {
  const options = input.lifeHealthOptions ?? [];
  if (input.family === "life" || input.family === "health") {
    const typeId: InsuranceTypeId = input.family === "life" ? "life" : "health";
    const subs = policySubtypesForType(input.family, typeId, options);
    const wanted = (input.policySubType ?? "").trim();
    const hit = subs.find((s) => s.label.toLowerCase() === wanted.toLowerCase()) ?? subs[0];
    return {
      typeId,
      subtypeId: hit?.id ?? wanted,
      subtypeLabel: hit?.label ?? wanted,
    };
  }
  const fromForm = insuranceTypeForQuotingForm(input.quotingForm);
  const typeId: InsuranceTypeId = fromForm ?? "home";
  const subs = policySubtypesForType("pc", typeId);
  const formId = coerceQuotingFormId(input.quotingForm) ?? (subs[0]?.id as QuotingFormId | undefined);
  const form = formId ? quotingFormById(formId) : null;
  const hit = subs.find((s) => s.id === form?.id) ?? subs[0];
  return {
    typeId,
    subtypeId: hit?.id ?? "HO3",
    subtypeLabel: hit?.label ?? "HO3",
  };
}

/** All P&C subtype labels (for field-builder catalog seed). */
export function allPcSubtypeLabels(): string[] {
  return QUOTING_FORMS.map((form) => form.label);
}
