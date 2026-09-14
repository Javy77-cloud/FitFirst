import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import {
  CO_APPLICANT_FIELDS,
  coApplicantHasValue,
  coApplicantRequired,
} from "./applicant-core";
import { fieldsForLine } from "./catalog";

export const SUPER_COPY_LABEL = "copy from this, not the PDFs";

/** Locked: Fill is in-product. Portal paste is human/bot. No TypTap / carrier login. */
export const COPY_SHEET_PORTAL_NOTE =
  "Fill Quote Sheet is in FitFirst (no bot). Pasting into TypTap or any carrier portal is a human or a quoting bot. FitFirst does not log into carriers.";

export const SUPER_COPY_INSTRUCTION =
  "Copy from this, not the PDFs. Fill Quote Sheet is in FitFirst (no bot). Super-Copy into carrier portals stays a human or a quoting bot unless a carrier API exists. Do not build portal macros.";

export type SuperCopyPacket = {
  label: typeof SUPER_COPY_LABEL;
  instruction: string;
  product: string;
  line: ShopLine;
  lineLabel: string;
  deal: {
    id: string;
    title: string;
  };
  contact: {
    name: string | null;
    dateOfBirth: string | null;
    note: string;
  };
  fields: {
    key: string;
    label: string;
    group: string;
    value: string;
    status: QuoteSheetFieldValue["status"];
    source: QuoteSheetFieldValue["source"];
  }[];
  filled: Record<string, string>;
};

export function buildSuperCopyPacket(input: {
  line: ShopLine;
  dealId: string;
  dealTitle: string;
  values: Record<string, QuoteSheetFieldValue>;
  contactName?: string | null;
  contactDob?: string | null;
}): SuperCopyPacket {
  const includeCoApplicant =
    coApplicantHasValue(input.values) || coApplicantRequired(input.values);
  const coKeys = new Set(CO_APPLICANT_FIELDS.map((field) => field.key));
  const fields = fieldsForLine(input.line)
    .filter((def) => includeCoApplicant || !coKeys.has(def.key))
    .map((def) => {
      const cell = input.values[def.key];
      return {
        key: def.key,
        label: def.label,
        group: def.group,
        value: cell?.value ?? "",
        status: cell?.status ?? "missing",
        source: cell?.source ?? "blank",
      };
    });
  const filled: Record<string, string> = {};
  for (const field of fields) {
    if (field.value.trim()) filled[field.key] = field.value;
  }
  return {
    label: SUPER_COPY_LABEL,
    instruction: SUPER_COPY_INSTRUCTION,
    product: "FitFirst Quote Sheet",
    line: input.line,
    lineLabel: SHOP_LINE_LABELS[input.line],
    deal: { id: input.dealId, title: input.dealTitle },
    contact: {
      name: input.contactName ?? null,
      dateOfBirth: input.contactDob ?? null,
      note: "People and DOB live on the Contact. They are not the Quote Sheet source of truth.",
    },
    fields,
    filled,
  };
}

/** Clean labeled clipboard pack for Gaya / the agent. Not a portal macro. */
export function buildCopySheetText(input: {
  line: ShopLine;
  dealId: string;
  dealTitle: string;
  values: Record<string, QuoteSheetFieldValue>;
  contactName?: string | null;
  contactDob?: string | null;
}): string {
  const packet = buildSuperCopyPacket(input);
  const lines: string[] = [
    `FitFirst ${packet.lineLabel} Quote Sheet`,
    SUPER_COPY_LABEL,
    "",
    `Deal: ${packet.deal.title}`,
  ];
  if (packet.contact.name) {
    const dob = packet.contact.dateOfBirth ? ` · DOB ${packet.contact.dateOfBirth}` : "";
    lines.push(`Contact (people/DOB live here, not on the sheet): ${packet.contact.name}${dob}`);
  }
  lines.push("");

  let currentGroup = "";
  for (const field of packet.fields) {
    if (!field.value.trim()) continue;
    if (field.group !== currentGroup) {
      if (currentGroup) lines.push("");
      lines.push(field.group);
      currentGroup = field.group;
    }
    lines.push(`${field.label}: ${field.value}`);
  }

  const missing = packet.fields.filter((field) => !field.value.trim()).map((field) => field.label);
  if (missing.length) {
    lines.push("");
    lines.push(`Missing (yellow): ${missing.join(", ")}`);
  }

  lines.push("");
  lines.push(COPY_SHEET_PORTAL_NOTE);
  return lines.join("\n");
}
