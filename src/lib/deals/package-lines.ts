import {
  LOB_TO_SHOP_LINE,
  SHOP_LINE_TO_LOB,
  isShopLine,
  type LineOfBusiness,
  type ShopLine,
} from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { quotingFormForProduct } from "@/lib/deals/deal-line";
import { defaultProductForLine } from "@/lib/quote-sheet/products";
import {
  inferDealProducts,
  normalizeDealProducts,
  productCreateDraft,
  productsFromForm as productsFromFormRaw,
  productsFromFormOrUndefined as productsFromFormOrUndefinedRaw,
  shopLinesFromProducts,
  uniqueLobsToBind,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { quoteMatchesShopLine, shopLineFromLob } from "@/lib/deals/shop-flow";

/** @deprecated Prefer DealProductId — kept for Home/Auto/Flood chip aliases. */
export const PC_PACKAGE_LINES = ["home", "auto", "flood"] as const;
export type PcPackageLine = (typeof PC_PACKAGE_LINES)[number];

export const PC_PACKAGE_LINE_LABELS: Record<PcPackageLine, string> = {
  home: "Home",
  auto: "Auto",
  flood: "Flood",
};

const PACKAGE_SET = new Set<string>(PC_PACKAGE_LINES);

export function isPcPackageLine(value: string | null | undefined): value is PcPackageLine {
  return Boolean(value && PACKAGE_SET.has(value));
}

/** Shop lines derived from the product picker (Home/Auto/Flood aliases still work). */
export function normalizePackageLines(selected: readonly string[] | null | undefined): ShopLine[] {
  return shopLinesFromProducts(normalizeDealProducts(selected));
}

export function packageLinesFromForm(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): ShopLine[] {
  return shopLinesFromProducts(productsFromFormRaw(form));
}

export function packageLinesFromFormOrUndefined(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): ShopLine[] | undefined {
  const products = productsFromFormOrUndefinedRaw(form);
  return products ? shopLinesFromProducts(products) : undefined;
}

export function primaryPackageLine(lines: readonly string[]): ShopLine {
  return normalizePackageLines(lines)[0] ?? "home";
}

export function lobForPackageLine(line: string): LineOfBusiness {
  if (isShopLine(line)) return SHOP_LINE_TO_LOB[line];
  return SHOP_LINE_TO_LOB[shopLinesFromProducts(normalizeDealProducts([line]))[0] ?? "home"];
}

export function defaultFormForPackageLine(line: PcPackageLine | ShopLine): string {
  if (isPcPackageLine(line)) {
    return quotingFormForProduct(defaultProductForLine(line)) ?? (line === "auto" ? "PA" : line === "flood" ? "FLOOD" : "HO3");
  }
  return quotingFormForProduct(defaultProductForLine(line)) ?? "HO3";
}

export function defaultFormForShopLine(line: ShopLine): string | undefined {
  if (isPcPackageLine(line)) return defaultFormForPackageLine(line);
  return quotingFormForProduct(defaultProductForLine(line));
}

/** Visible shop lines for sheets / markets. Products (incl. Life/Health/Commercial) are chips. */
export function resolveVisiblePackageLines(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): ShopLine[] {
  return shopLinesFromProducts(
    inferDealProducts({
      shopProducts: input.shopProducts,
      shopLines: input.shopLines,
      lineOfBusiness: input.lineOfBusiness,
      quotingLine: input.quotingLine,
      quotingForm: input.quotingForm,
      policySubType: input.policySubType,
    }),
  );
}

export function resolveActivePackageLine(input: {
  lineParam?: string | null;
  packageLines: readonly string[];
  quotingLine?: string | null;
  lineOfBusiness?: string | null;
}): ShopLine | null {
  const lines = input.packageLines.filter(isShopLine);
  const ordered = lines.length ? lines : normalizePackageLines(["home"]);
  if (!input.packageLines.length) return ordered[0] ?? null;
  const param = (input.lineParam ?? "").trim().toLowerCase();
  if (isShopLine(param) && ordered.includes(param)) return param;
  const quoting = (input.quotingLine ?? "").trim().toLowerCase();
  if (isShopLine(quoting) && ordered.includes(quoting)) return quoting;
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  if (fromLob && ordered.includes(fromLob)) return fromLob;
  return ordered[0] ?? null;
}

export function dealLineSwitcherHref(input: {
  dealId: string;
  line: string;
  tab?: string | null;
  product?: string | null;
}): string {
  const query = new URLSearchParams();
  if (input.tab) query.set("tab", input.tab);
  query.set("line", input.line);
  if (input.product) query.set("product", input.product);
  return `/deals/${input.dealId}?${query.toString()}`;
}

/** Keep non-package shop lines (companions, life) when the agent edits Home/Auto/Flood. */
export function mergePackageShopLines(
  existing: readonly string[] | null | undefined,
  nextPackage: readonly string[] | null | undefined,
): ShopLine[] {
  const extras = (existing ?? []).filter((line): line is ShopLine => isShopLine(line) && !isPcPackageLine(line));
  return [...normalizePackageLines(nextPackage), ...extras];
}

export function mergeShopLinesKeepExisting(
  existing: readonly string[] | null | undefined,
  added: readonly string[] | null | undefined,
): ShopLine[] {
  const next: ShopLine[] = [];
  for (const raw of [...(existing ?? []), ...(added ?? [])]) {
    if (isShopLine(raw) && !next.includes(raw)) next.push(raw);
  }
  return next.length ? next : ["home"];
}

export function sheetHasUserData(values: Record<string, QuoteSheetFieldValue> | null | undefined): boolean {
  if (!values) return false;
  return Object.entries(values).some(([key, cell]) => {
    if (key === "quoting_form" || key === "sheet_product") return false;
    const value = (cell?.value ?? "").trim();
    if (!value) return false;
    return cell?.status !== "missing" || cell?.source !== "blank";
  });
}

/** Hide unchecked lines from the switcher; keep the sheet if it has data. */
export function visibleSwitcherLines(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): ShopLine[] {
  return resolveVisiblePackageLines(input);
}

export function packageCreateDraft(lines: readonly string[] | null | undefined): {
  shopLines: ShopLine[];
  products: DealProductId[];
  primary: ShopLine;
  lineOfBusiness: LineOfBusiness;
  quotingLine: ShopLine;
  quotingForm: string;
  riskType: "property" | "auto";
  accountKind: "personal" | "commercial";
  bindTarget: "contact" | "account";
  pipelineSlug: string;
} {
  const draft = productCreateDraft(lines);
  return {
    shopLines: draft.shopLines,
    products: draft.products,
    primary: draft.quotingLine,
    lineOfBusiness: draft.lineOfBusiness,
    quotingLine: draft.quotingLine,
    quotingForm: draft.quotingForm,
    riskType: draft.riskType,
    accountKind: draft.accountKind,
    bindTarget: draft.bindTarget,
    pipelineSlug: draft.pipelineSlug,
  };
}

export function quotingFormFromSheet(values: Record<string, QuoteSheetFieldValue> | null | undefined): string | null {
  const form = values?.quoting_form?.value?.trim();
  if (form) return form;
  return null;
}

export function resolveLineQuotingForm(input: {
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  sheetLine: ShopLine;
  dealQuotingForm?: string | null;
  dealQuotingLine?: string | null;
  dealLineOfBusiness?: string | null;
}): string {
  const fromSheet = quotingFormFromSheet(input.sheetValues);
  if (fromSheet) return fromSheet;
  const dealLine = parseShopLineLoose(input.dealQuotingLine, input.dealLineOfBusiness);
  if (dealLine === input.sheetLine && input.dealQuotingForm?.trim()) {
    return input.dealQuotingForm.trim();
  }
  return defaultFormForShopLine(input.sheetLine) ?? "HO3";
}

function parseShopLineLoose(quotingLine?: string | null, lineOfBusiness?: string | null): ShopLine {
  if (isShopLine(quotingLine)) return quotingLine;
  const fromLob = LOB_TO_SHOP_LINE[(lineOfBusiness ?? "").toUpperCase()];
  return fromLob ?? "home";
}

export function resolveShopLineAndLob(input: {
  override?: string | null;
  quotingLine?: string | null;
  lineOfBusiness?: string | null;
}): { line: ShopLine; lob: string } {
  const override = (input.override ?? "").trim();
  if (isShopLine(override)) {
    return { line: override, lob: SHOP_LINE_TO_LOB[override] };
  }
  const asLob = override.toUpperCase();
  if (asLob && LOB_TO_SHOP_LINE[asLob]) {
    return { line: LOB_TO_SHOP_LINE[asLob], lob: asLob };
  }
  const line = parseShopLineLoose(input.quotingLine, input.lineOfBusiness);
  return { line, lob: SHOP_LINE_TO_LOB[line] ?? input.lineOfBusiness ?? "HO" };
}

export function lobsToBindForDeal(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
}): string[] {
  return uniqueLobsToBind(input);
}

export function unboundPolicyLines(
  wantedLobs: readonly string[],
  existingPolicies: readonly { lineOfBusiness: string }[],
): string[] {
  const have = new Set(existingPolicies.map((row) => row.lineOfBusiness));
  return wantedLobs.filter((lob) => !have.has(lob));
}

export function pickQuoteForLine<
  Q extends { bindable?: boolean | null; quoteAttemptLogId?: string | null },
  L extends { id: string; lineOfBusiness?: string | null },
>(quotes: readonly Q[], logs: readonly L[], lob: string, opts?: { primaryLob?: string }): Q | undefined {
  const logIds = new Set(
    logs.filter((log) => (log.lineOfBusiness ?? "").toUpperCase() === lob.toUpperCase()).map((log) => log.id),
  );
  const tagged = quotes.filter((quote) => quote.quoteAttemptLogId && logIds.has(quote.quoteAttemptLogId));
  if (tagged.length) return tagged.find((row) => row.bindable) ?? tagged[0];
  const primary = (opts?.primaryLob ?? lob).toUpperCase();
  if (primary !== lob.toUpperCase()) return undefined;
  return quotes.find((row) => row.bindable) ?? quotes[0];
}

export function quoteBelongsToLine(input: {
  quoteAttemptLogId?: string | null;
  shopLine?: string | null;
  notes?: string | null;
  logs: readonly { id: string; lineOfBusiness?: string | null }[];
  lob: string;
  isPrimaryLine: boolean;
  /** When true, untagged quotes do not spill onto every product chip. */
  multiLine?: boolean;
}): boolean {
  const wanted = shopLineFromLob(input.lob);
  if (!wanted) {
    if (!input.quoteAttemptLogId) return input.isPrimaryLine;
    const log = input.logs.find((row) => row.id === input.quoteAttemptLogId);
    if (!log) return input.isPrimaryLine;
    return (log.lineOfBusiness ?? "").toUpperCase() === input.lob.toUpperCase();
  }
  return quoteMatchesShopLine(
    {
      shopLine: input.shopLine,
      quoteAttemptLogId: input.quoteAttemptLogId,
      notes: input.notes,
      logs: input.logs,
    },
    wanted,
    { multiLine: input.multiLine ?? false, isPrimaryLine: input.isPrimaryLine },
  );
}

export function logBelongsToLine(
  logLineOfBusiness: string | null | undefined,
  lob: string,
  isPrimaryLine: boolean,
): boolean {
  const raw = (logLineOfBusiness ?? "").trim();
  if (!raw) return isPrimaryLine;
  return raw.toUpperCase() === lob.toUpperCase();
}

export function formatMailingLine(input: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const street = (input.address1 ?? "").trim();
  const city = (input.city ?? "").trim();
  const state = (input.state ?? "").trim();
  const zip = (input.zip ?? "").trim();
  const locality = [city, state].filter(Boolean).join(", ");
  return [street, locality, zip].filter(Boolean).join(" · ");
}

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  gather: "Gather info",
  gather_info: "Gather info",
  shopping: "Gather info",
  quotes: "Meet / Quotes",
  meet_quotes: "Meet / Quotes",
  quoting: "Meet / Quotes",
  review: "Review",
  quote_sent: "Quote Sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  pending_inspection: "Pending Inspection",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  lost: "Closed Lost",
};

export function humanizeDealStage(stage: string | null | undefined): string {
  const raw = (stage ?? "").trim();
  if (!raw) return "—";
  const key = raw
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (STAGE_DISPLAY_NAMES[key]) return STAGE_DISPLAY_NAMES[key];
  if (key === "gather" || key.startsWith("gather")) return "Gather info";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
