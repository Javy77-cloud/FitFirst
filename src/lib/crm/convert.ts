import { LINES, LOB_TO_SHOP_LINE, type ShopLine } from "@/lib/domain";
import { namedInsuredFromLead } from "@/lib/crm/lead-fields";
import { sourceLabel } from "@/lib/crm/sources";
import { fillSheetFromLead, leadOntoRisk, type LeadCopyFields } from "@/lib/desk/copy-once";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { pipelineSlugFromLeadPipeline } from "@/lib/custom-fields/lead-picklist-options";
import { dealValuesFromLead, filterLeadForCarry } from "@/lib/custom-fields/transfer";
import { formatDealTitle } from "@/lib/deals/deal-title";
import { coerceQuotingFormId } from "@/lib/quoting/forms";

export type ConvertLead = LeadCopyFields & {
  lastName: string;
  insuranceTypeDesired?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  status?: string | null;
  temperature?: string | null;
};

export function pipelineSlugForLine(line: string) {
  if (line === "HEALTH") return "health";
  if (line === "LIFE") return "life";
  if (line === "FLOOD") return "flood";
  return "p-c";
}

export function shopLinesForConvert(primaryLine: string): ShopLine[] {
  const fromLob = LOB_TO_SHOP_LINE[primaryLine];
  return fromLob ? [fromLob] : ["home"];
}

export function resolveConvertLine(requested: string | null | undefined, leadLine?: string | null) {
  if (requested && (LINES as readonly string[]).includes(requested)) return requested;
  if (leadLine && (LINES as readonly string[]).includes(leadLine)) return leadLine;
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

export function dealTitleFromLead(lead: ConvertLead, line: string) {
  return formatDealTitle({
    firstName: lead.firstName,
    lastName: lead.lastName,
    line,
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
  const quotingForm = coerceQuotingFormId(subtypeRaw);
  return {
    dealState,
    shopLines,
    pipelineSlug: fromPipeline || pipelineSlugForLine(line),
    title: dealTitleFromLead(lead, line),
    notes: dealNotesFromLead(filtered),
    source: filtered.source ?? null,
    primaryNamedInsured: namedInsuredFromLead(filtered) || null,
    risk: leadOntoRisk(filtered, dealState),
    sheetValues: fillSheetFromLead(filtered),
    sheetLine: (line === "AUTO" ? "auto" : shopLines[0] ?? "home") as ShopLine,
    carried: filtered,
    fieldValues: dealValuesFromLead(filtered, CORE_FIELDS, carryFields, leadCustom),
    quotingForm: quotingForm ?? null,
    policySubType: subtypeRaw || null,
    insuranceType: (leadCustom?.insurance_type ?? "").trim() || null,
    contactMailingAddress: (leadCustom?.contact_mailing_address ?? "").trim() || null,
  };
}
