import { LINES, LOB_TO_SHOP_LINE, type ShopLine } from "@/lib/domain";
import { namedInsuredFromLead } from "@/lib/crm/lead-fields";
import { sourceLabel } from "@/lib/crm/sources";
import { fillSheetFromLead, leadOntoRisk, type LeadCopyFields } from "@/lib/desk/copy-once";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { pipelineSlugFromLeadPipeline } from "@/lib/custom-fields/lead-picklist-options";
import { dealValuesFromLead, filterLeadForCarry } from "@/lib/custom-fields/transfer";
import { DEAL_TITLE_LOB_WORDS, dealTitleFormWord, dealTitleLobWord, formatDealTitle } from "@/lib/deals/deal-title";
import { pipelineSlugForLine as pipelineSlugForLineFromShop } from "@/lib/lifecycle/shop";
import { coerceQuotingFormId, dealCreateFieldsFromPick, quotingFormById } from "@/lib/quoting/forms";

export function pipelineSlugForLine(line: string) {
  return pipelineSlugForLineFromShop(line);
}

export type ConvertLead = LeadCopyFields & {
  lastName: string;
  insuranceTypeDesired?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  status?: string | null;
  temperature?: string | null;
};

export function shopLinesForConvert(primaryLine: string): ShopLine[] {
  const fromLob = LOB_TO_SHOP_LINE[primaryLine];
  return fromLob ? [fromLob] : ["home"];
}

/** Insurance Type picklist labels → LOB when subtype is empty / Life / Health. */
const INSURANCE_TYPE_LABEL_TO_LOB: Record<string, string> = {
  // Legacy product-line labels still resolve when stored on older leads.
  home: "HO",
  homeowners: "HO",
  landlord: "HO",
  renters: "HO",
  auto: "AUTO",
  motorcycle: "AUTO",
  "commercial auto": "AUTO",
  "rec / rv": "RV",
  "rec/rv": "RV",
  rv: "RV",
  "recreational vehicle": "RV",
  "boat/watercraft": "RV",
  boat: "RV",
  watercraft: "RV",
  flood: "FLOOD",
  umbrella: "UMBRELLA",
  commercial: "GL",
  life: "LIFE",
  health: "HEALTH",
  gl: "GL",
  bop: "BOP",
  "workers comp": "WC",
  "workers' comp": "WC",
};

function lobFromFormOrLabel(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if ((LINES as readonly string[]).includes(value)) return value;
  if ((LINES as readonly string[]).includes(value.toUpperCase())) return value.toUpperCase();
  const formId = coerceQuotingFormId(value);
  if (formId) {
    // Life / Health legacy map points at HO3 — prefer label map for those words.
    const lower = value.toLowerCase();
    if (lower === "life" || lower === "health") {
      return INSURANCE_TYPE_LABEL_TO_LOB[lower] ?? null;
    }
    const form = quotingFormById(formId);
    if (form?.lob && (LINES as readonly string[]).includes(form.lob)) return form.lob;
  }
  return INSURANCE_TYPE_LABEL_TO_LOB[value.toLowerCase()] ?? null;
}

/**
 * Prefer lead custom Insurance subtype, then Insurance Type.
 * Used so convert does not silently fall to HO when the lead already named a product.
 */
export function lobFromLeadInsuranceCustom(
  leadCustom?: Record<string, string> | null,
): string | null {
  if (!leadCustom) return null;
  const subtype = (leadCustom.insurance_subtype ?? "").trim();
  const type = (leadCustom.insurance_type ?? "").trim();
  return lobFromFormOrLabel(subtype) ?? lobFromFormOrLabel(type);
}

/**
 * Resolve convert LOB: lead custom subtype/type first, then explicit requested,
 * then insuranceTypeDesired, else HO schema default.
 */
export function resolveConvertLine(
  requested: string | null | undefined,
  leadLine?: string | null,
  leadCustom?: Record<string, string> | null,
) {
  const fromCustom = lobFromLeadInsuranceCustom(leadCustom);
  if (fromCustom) return fromCustom;
  if (requested && (LINES as readonly string[]).includes(requested)) return requested;
  const fromDesired = lobFromFormOrLabel(leadLine) ?? (
    leadLine && (LINES as readonly string[]).includes(leadLine) ? leadLine : null
  );
  if (fromDesired) return fromDesired;
  return "HO";
}

export function dealNotesFromLead(lead: ConvertLead): string | null {
  const parts = [
    lead.notes?.trim() || "",
    lead.source ? `Source: ${sourceLabel(lead.source)}` : "",
    lead.preferredLanguage ? `Language: ${lead.preferredLanguage}` : "",
    lead.temperature ? `Temperature: ${lead.temperature}` : "",
    lead.status ? `Lead status: ${lead.status}` : "",
    lead.insuranceTypeDesired ? `Insurance desired: ${lead.insuranceTypeDesired}` : "",
    lead.email ? `Email: ${lead.email}` : "",
    lead.phone ? `Phone: ${lead.phone}` : "",
    lead.dateOfBirth ? `DOB: ${lead.dateOfBirth}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export function dealTitleFromLead(
  lead: ConvertLead,
  line: string,
  form?: { quotingForm?: string | null; policySubType?: string | null },
) {
  return formatDealTitle({
    firstName: lead.firstName,
    lastName: lead.lastName,
    line,
    quotingForm: form?.quotingForm,
    policySubType: form?.policySubType,
  });
}

/** Everything convert copies so the agent does not retype. Contact is attached only when a match already exists. */
export function convertFieldCopy(
  lead: ConvertLead,
  line: string,
  state: string,
  carryFields?: readonly string[] | null,
  leadCustom?: Record<string, string> | null,
) {
  const filtered = filterLeadForCarry(lead, carryFields);
  const dealState = state || filtered.state || lead.state || "FL";
  const shopLines = shopLinesForConvert(line);
  const fromPipeline = pipelineSlugFromLeadPipeline(leadCustom?.pipeline);
  const subtypeRaw = (leadCustom?.insurance_subtype ?? "").trim();
  const typeRaw = (leadCustom?.insurance_type ?? "").trim();
  // Do not coerce Life/Health type words through legacy HO3 mapping.
  const pcFormId =
    coerceQuotingFormId(subtypeRaw) ??
    (line === "LIFE" || line === "HEALTH" ? null : coerceQuotingFormId(typeRaw)) ??
    null;
  const form = pcFormId ? quotingFormById(pcFormId) : null;
  let policySubType = subtypeRaw || form?.label || null;
  let quotingForm = form?.id ?? (line === "LIFE" || line === "HEALTH" ? subtypeRaw || null : null);
  let quotingLine = (form?.shopLine ?? shopLines[0] ?? "home") as ShopLine;
  if (line === "LIFE" || line === "HEALTH") {
    const picked = dealCreateFieldsFromPick(
      subtypeRaw || typeRaw || (line === "LIFE" ? "Life" : "Health"),
    );
    quotingForm = picked.quotingForm;
    policySubType = picked.policySubType;
    quotingLine = picked.quotingLine;
  }
  return {
    dealState,
    shopLines,
    pipelineSlug: fromPipeline || pipelineSlugForLine(line),
    title: dealTitleFromLead(lead, line, {
      quotingForm: quotingForm ?? null,
      policySubType,
    }),
    notes: dealNotesFromLead(filtered),
    source: filtered.source ?? null,
    primaryNamedInsured: namedInsuredFromLead(filtered) || null,
    risk: leadOntoRisk(filtered, dealState),
    sheetValues: fillSheetFromLead(filtered),
    sheetLine: (line === "AUTO" ? "auto" : quotingLine) as ShopLine,
    quotingLine,
    carried: filtered,
    fieldValues: dealValuesFromLead(filtered, CORE_FIELDS, carryFields, leadCustom),
    quotingForm: quotingForm ?? null,
    policySubType,
    insuranceType: typeRaw || null,
    contactMailingAddress: (leadCustom?.contact_mailing_address ?? "").trim() || null,
  };
}

export type ConvertActivityDeal = {
  lineOfBusiness?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
};

/** Line + product for convert/activity copy — never a hardcoded Homeowners. */
export function convertActivityLineLabel(input: ConvertActivityDeal): string {
  const line = (input.lineOfBusiness ?? "").trim().toUpperCase();
  const form =
    dealTitleFormWord(input.quotingForm) ?? dealTitleFormWord(input.policySubType);
  const family = (line && DEAL_TITLE_LOB_WORDS[line]) || null;
  if (form && family && form.toLowerCase() !== family.toLowerCase()) {
    return `${family} / ${form}`;
  }
  return form || family || dealTitleLobWord(line || null, input.quotingForm ?? input.policySubType);
}

export function convertActivityTitle(input: ConvertActivityDeal): string {
  return `Lead converted · ${convertActivityLineLabel(input)}`;
}

const CONVERT_ACTIVITY_RE = /lead converted|converted ·|converted to/i;

/** Rewrite convert log titles that used the wrong line (e.g. Homeowners on a Life deal). */
export function relabelConvertActivityTitle(
  title: string | null | undefined,
  deal: ConvertActivityDeal,
): string | null {
  const raw = (title ?? "").trim();
  if (!raw) return title ?? null;
  if (!CONVERT_ACTIVITY_RE.test(raw)) return title ?? null;
  return convertActivityTitle(deal);
}
