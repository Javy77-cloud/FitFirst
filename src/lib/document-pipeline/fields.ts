import { FORM_TEMPLATE_SEEDS } from "@/lib/forms/catalog";
import {
  DOCUMENT_PIPELINE_TEMPLATE_SLUGS,
  type DocumentPipelineDealExtras,
  type DocumentPipelineExtractField,
  type DocumentPipelineJobType,
} from "./types";

export const LETTER_FIELD_ALIASES: Record<string, string[]> = {
  named_insured: [
    "named_insured",
    "current_policy_named_insured",
    "current_policy_name_insured",
    "applicant_name",
  ],
  phone: ["phone"],
  email: ["email"],
  mailing: ["mailing", "mailing_address", "contact_mailing_address"],
  policy_number: ["policy_number", "policy_no", "policy_num", "pol_number", "pol_no"],
  current_carrier: ["current_carrier"],
  effective_date: ["effective_date", "eff_date", "policy_effective_date", "inception_date"],
  cancellation_date: ["cancellation_date"],
  cancellation_reason: ["cancellation_reason"],
  prior_agency: ["prior_agency", "selling_agency"],
  new_agency: ["new_agency"],
};

export function letterTemplateSlug(type: DocumentPipelineJobType): string {
  return DOCUMENT_PIPELINE_TEMPLATE_SLUGS[type];
}

export function letterFieldDefs(type: DocumentPipelineJobType) {
  const slug = letterTemplateSlug(type);
  const seed = FORM_TEMPLATE_SEEDS.find((row) => row.slug === slug);
  return seed?.fields ?? [];
}

export function letterTemplateName(type: DocumentPipelineJobType): string {
  const slug = letterTemplateSlug(type);
  return FORM_TEMPLATE_SEEDS.find((row) => row.slug === slug)?.name ?? DOCUMENT_PIPELINE_TEMPLATE_SLUGS[type];
}

export function extrasToFieldMap(extras: DocumentPipelineDealExtras = {}): Record<string, string> {
  return trimRecord({
    named_insured: extras.namedInsured,
    phone: extras.phone,
    email: extras.email,
    mailing: extras.mailing,
    current_carrier: extras.currentCarrier,
    policy_number: extras.policyNumber,
    effective_date: extras.effectiveDate,
    new_agency: extras.newAgency,
  });
}

function trimRecord(input: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const trimmed = (value ?? "").trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function emptyExtractFields(
  type: DocumentPipelineJobType,
  extras: DocumentPipelineDealExtras = {},
): DocumentPipelineExtractField[] {
  const fallback = extrasToFieldMap(extras);
  return letterFieldDefs(type).map((field) => {
    const extracted = fallback[field.key] ?? "";
    return {
      key: field.key,
      label: field.label,
      group: field.group,
      extracted,
      confidence: extracted ? 0.4 : 0,
      source: extracted ? "deal" : "blank",
    };
  });
}
