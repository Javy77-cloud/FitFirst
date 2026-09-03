import { SUPER_COPY_KIND, SHOP_LINE_LABELS, type QuoteSheetFieldValue, type ShopLine } from "@/lib/domain";
import { HOME_SHEET_FIELDS } from "@/lib/lifecycle/quote-sheet";

export const SUPER_COPY_LABEL = "copy from this, not the PDFs";
export const FILL_MESSAGE_TYPE = "FITFIRST_SEND_TO_FILL";
export const FILL_MESSAGE_SOURCE = "fitfirst-desk";
export const FILL_STORAGE_KEY = "fitfirst.fill.sheet";

export type SheetCell = QuoteSheetFieldValue;

export type SuperCopyPacket = {
  kind: typeof SUPER_COPY_KIND;
  version: 1;
  label: typeof SUPER_COPY_LABEL;
  instruction: string;
  product: "FitFirst Quote Sheet";
  line: ShopLine;
  lineLabel: string;
  tenantId: string;
  deal: { id: string; title: string };
  contact: { name: string | null };
  fields: {
    key: string;
    label: string;
    group: string;
    value: string;
    status: QuoteSheetFieldValue["status"];
    source: QuoteSheetFieldValue["source"];
  }[];
  filled: Record<string, string>;
  quoteSheet: Record<string, QuoteSheetFieldValue>;
};

/** Portal fill payload. Built from quote_sheets.values — never from raw PDFs. */
export type FillSheet = {
  kind: typeof SUPER_COPY_KIND;
  version: 1;
  tenantId: string;
  dealId: string;
  source: "quote_sheets";
  line: ShopLine;
  insured: { primary: string | null };
  quoteSheet: Record<string, QuoteSheetFieldValue>;
  filled: Record<string, string>;
  risk: Record<string, string>;
};

function cellsForLine(values: Record<string, QuoteSheetFieldValue>) {
  return HOME_SHEET_FIELDS.map((def) => {
    const cell = values[def.key];
    return {
      key: def.key,
      label: def.label,
      group: def.group,
      value: cell?.value ?? "",
      status: cell?.status ?? ("missing" as const),
      source: cell?.source ?? ("blank" as const),
    };
  });
}

function filledFromValues(values: Record<string, QuoteSheetFieldValue>) {
  const filled: Record<string, string> = {};
  for (const [key, cell] of Object.entries(values)) {
    if (cell?.value?.trim()) filled[key] = cell.value;
  }
  return filled;
}

export function buildSuperCopyPacket(input: {
  line: ShopLine;
  tenantId: string;
  dealId: string;
  dealTitle: string;
  values: Record<string, QuoteSheetFieldValue>;
  contactName?: string | null;
}): SuperCopyPacket {
  const fields = cellsForLine(input.values);
  return {
    kind: SUPER_COPY_KIND,
    version: 1,
    label: SUPER_COPY_LABEL,
    instruction:
      "Copy from this Quote Sheet record, not the PDFs. Super-Copy, Send to Fill, and Forms Fill share these values.",
    product: "FitFirst Quote Sheet",
    line: input.line,
    lineLabel: SHOP_LINE_LABELS[input.line],
    tenantId: input.tenantId,
    deal: { id: input.dealId, title: input.dealTitle },
    contact: { name: input.contactName ?? null },
    fields,
    filled: filledFromValues(input.values),
    quoteSheet: input.values,
  };
}

export function buildFillSheetFromQuoteSheet(input: {
  tenantId: string;
  dealId: string;
  line: ShopLine;
  values: Record<string, QuoteSheetFieldValue>;
  insured?: string | null;
}): FillSheet {
  const filled = filledFromValues(input.values);
  return {
    kind: SUPER_COPY_KIND,
    version: 1,
    tenantId: input.tenantId,
    dealId: input.dealId,
    source: "quote_sheets",
    line: input.line,
    insured: { primary: input.insured ?? null },
    quoteSheet: input.values,
    filled,
    risk: filled,
  };
}

export function sheetPacketFingerprint(values: Record<string, QuoteSheetFieldValue>) {
  return HOME_SHEET_FIELDS.map((field) => `${field.key}=${values[field.key]?.value ?? ""}`).join("|");
}
