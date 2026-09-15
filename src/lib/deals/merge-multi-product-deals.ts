import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  inferDealProducts,
  shopLinesFromProducts,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { sheetHasUserData } from "@/lib/deals/package-lines";

export type MergeDealRow = {
  id: string;
  title: string;
  primaryNamedInsured?: string | null;
  lineOfBusiness?: string | null;
  quotingForm?: string | null;
  quotingLine?: string | null;
  policySubType?: string | null;
  shopLines?: string[] | null;
  shopProducts?: string[] | null;
  archivedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  contactId?: string | null;
};

export type MergeRichness = {
  dealId: string;
  docs: number;
  quotes: number;
  filledSheetCells: number;
  sheetLines: string[];
};

export const GLORIA_HINT_IDS = {
  ho3: "8f4e7b68-2de3-458e-914b-ba60ea3c47aa",
  dp3: "03dccdd7-db06-4c89-9b7a-cf0a2064d044",
} as const;

export const HEATHER_HINT_IDS = {
  home: "5ed997ba-21b5-4a70-bdf8-c78810cc79b1",
  contact: "79cf650c-46fb-4b85-879c-16112c3d2889",
} as const;

export function dealMatchesPerson(deal: MergeDealRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  const hay = `${deal.title ?? ""} ${deal.primaryNamedInsured ?? ""}`.toLowerCase();
  return needle.split(/\s+/).every((part) => hay.includes(part));
}

export function productsFromMergeDeal(deal: MergeDealRow): DealProductId[] {
  return inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
}

export function richnessScore(row: MergeRichness, deal?: MergeDealRow): number {
  const lines = deal ? shopLinesFromProducts(productsFromMergeDeal(deal)).length : row.sheetLines.length;
  return row.docs * 4 + row.quotes * 3 + row.filledSheetCells + lines * 2;
}

export function pickRicherSurvivor(
  deals: readonly MergeDealRow[],
  richness: readonly MergeRichness[],
  preferId?: string | null,
): string {
  if (!deals.length) throw new Error("No deals to merge");
  const byId = new Map(richness.map((row) => [row.dealId, row]));
  const ranked = [...deals].sort((a, b) => {
    const sa = richnessScore(byId.get(a.id) ?? emptyRichness(a.id), a);
    const sb = richnessScore(byId.get(b.id) ?? emptyRichness(b.id), b);
    if (sb !== sa) return sb - sa;
    if (preferId && a.id === preferId) return -1;
    if (preferId && b.id === preferId) return 1;
    const ta = new Date(a.updatedAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? 0).getTime();
    return tb - ta;
  });
  return ranked[0]!.id;
}

function emptyRichness(dealId: string): MergeRichness {
  return { dealId, docs: 0, quotes: 0, filledSheetCells: 0, sheetLines: [] };
}

export function filledSheetCellCount(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
): number {
  if (!values) return 0;
  return Object.entries(values).filter(([key, cell]) => {
    if (key === "quoting_form" || key === "sheet_product") return false;
    return Boolean((cell?.value ?? "").trim());
  }).length;
}

/** Survivor wins on filled keys; donor fills blanks. */
export function mergeQuoteSheetValues(
  survivor: Record<string, QuoteSheetFieldValue> | null | undefined,
  donor: Record<string, QuoteSheetFieldValue> | null | undefined,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...(survivor ?? {}) };
  for (const [key, cell] of Object.entries(donor ?? {})) {
    const have = (next[key]?.value ?? "").trim();
    if (!have && (cell?.value ?? "").trim()) next[key] = cell;
  }
  return next;
}

export type BookMergePlan = {
  survivorId: string;
  donorIds: string[];
  products: DealProductId[];
  shopLines: string[];
  alreadyMerged: boolean;
};

export function planPersonMerge(input: {
  deals: readonly MergeDealRow[];
  richness: readonly MergeRichness[];
  preferId?: string | null;
  requiredProducts?: readonly DealProductId[];
}): BookMergePlan | null {
  const open = input.deals.filter((deal) => !deal.archivedAt);
  if (!open.length) return null;
  const products = [...new Set(open.flatMap(productsFromMergeDeal))];
  if (input.requiredProducts?.length) {
    const missing = input.requiredProducts.filter((id) => !products.includes(id));
    if (open.length === 1 && !missing.length) {
      return {
        survivorId: open[0]!.id,
        donorIds: [],
        products,
        shopLines: shopLinesFromProducts(products),
        alreadyMerged: true,
      };
    }
  }
  if (open.length === 1) {
    return {
      survivorId: open[0]!.id,
      donorIds: [],
      products,
      shopLines: shopLinesFromProducts(products),
      alreadyMerged: true,
    };
  }
  const survivorId = pickRicherSurvivor(open, input.richness, input.preferId);
  return {
    survivorId,
    donorIds: open.filter((deal) => deal.id !== survivorId).map((deal) => deal.id),
    products,
    shopLines: shopLinesFromProducts(products),
    alreadyMerged: false,
  };
}

export function sheetMoveAction(input: {
  survivorHasLine: boolean;
  donorHasUserData: boolean;
}): "move" | "merge-into-survivor" | "skip" {
  if (!input.survivorHasLine) return "move";
  if (input.donorHasUserData) return "merge-into-survivor";
  return "skip";
}

export function donorSheetHasData(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
): boolean {
  return sheetHasUserData(values);
}

export const BOOK_MERGE_TARGETS = [
  {
    key: "gloria",
    query: "Gloria Martinez",
    requiredProducts: ["homeowners", "landlord"] as const,
    preferId: GLORIA_HINT_IDS.ho3,
    hintIds: [GLORIA_HINT_IDS.ho3, GLORIA_HINT_IDS.dp3],
  },
  {
    key: "heather",
    query: "Heather Camirand",
    requiredProducts: ["homeowners", "auto", "flood"] as const,
    preferId: HEATHER_HINT_IDS.home,
    hintIds: [HEATHER_HINT_IDS.home],
  },
] as const;
