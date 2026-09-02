import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { fieldsForLine } from "./catalog";

export const SUPER_COPY_LABEL = "copy from this, not the PDFs";

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
  const fields = fieldsForLine(input.line).map((def) => {
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
    instruction:
      "Copy from this, not the PDFs. This Quote Sheet is the packet the quoting bot pastes. Source PDFs stay on Files.",
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
