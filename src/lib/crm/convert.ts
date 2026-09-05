import { LINES, LOB_TO_SHOP_LINE, type ShopLine } from "@/lib/domain";
import { namedInsuredFromLead } from "@/lib/crm/lead-fields";
import { sourceLabel } from "@/lib/crm/sources";
import { fillSheetFromLead, leadOntoRisk, type LeadCopyFields } from "@/lib/desk/copy-once";

export type ConvertLead = LeadCopyFields & {
  lastName: string;
  insuranceTypeDesired?: string | null;
  ownerId?: string | null;
  notes?: string | null;
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
    lead.email ? `Email: ${lead.email}` : "",
    lead.phone ? `Phone: ${lead.phone}` : "",
    lead.dateOfBirth ? `DOB: ${lead.dateOfBirth}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export function dealTitleFromLead(lead: ConvertLead, line: string) {
  return `${lead.lastName} · ${line} shop`;
}

/** Everything convert copies so the agent does not retype. Contact is attached only when a match already exists. */
export function convertFieldCopy(lead: ConvertLead, line: string, state: string) {
  const dealState = state || lead.state || "FL";
  const shopLines = shopLinesForConvert(line);
  return {
    dealState,
    shopLines,
    pipelineSlug: pipelineSlugForLine(line),
    title: dealTitleFromLead(lead, line),
    notes: dealNotesFromLead(lead),
    source: lead.source ?? null,
    primaryNamedInsured: namedInsuredFromLead(lead),
    risk: leadOntoRisk(lead, dealState),
    sheetValues: fillSheetFromLead(lead),
    sheetLine: (line === "AUTO" ? "auto" : shopLines[0] ?? "home") as ShopLine,
  };
}
