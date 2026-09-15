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

/** Personal PC package lines that can share one deal. */
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

/** Default Home when nothing is checked. Order is Home → Auto → Flood. */
export function normalizePackageLines(selected: readonly string[] | null | undefined): PcPackageLine[] {
  const picked = new Set<PcPackageLine>();
  for (const raw of selected ?? []) {
    const value = String(raw ?? "").trim().toLowerCase();
    if (isPcPackageLine(value)) picked.add(value);
  }
  const ordered = PC_PACKAGE_LINES.filter((line) => picked.has(line));
  return ordered.length ? ordered : ["home"];
}

export function packageLinesFromForm(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): PcPackageLine[] {
  if (!form) return ["home"];
  const many = typeof form.getAll === "function" ? form.getAll("shopLines") : [];
  const raw = (many ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
  if (!raw.length && typeof form.get === "function") {
    const single = String(form.get("shopLines") ?? "").trim();
    if (single) raw.push(...single.split(","));
  }
  if (!raw.length) return ["home"];
  return normalizePackageLines(raw);
}

export function packageLinesFromFormOrUndefined(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): PcPackageLine[] | undefined {
  if (!form) return undefined;
  const many = typeof form.getAll === "function" ? form.getAll("shopLines") : [];
  const raw = (many ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
  if (!raw.length && typeof form.get === "function") {
    const single = String(form.get("shopLines") ?? "").trim();
    if (single) raw.push(...single.split(","));
  }
  if (!raw.length) return undefined;
  return normalizePackageLines(raw);
}

export function primaryPackageLine(lines: readonly PcPackageLine[]): PcPackageLine {
  return normalizePackageLines(lines)[0] ?? "home";
}

export function lobForPackageLine(line: PcPackageLine): LineOfBusiness {
  return SHOP_LINE_TO_LOB[line];
}

export function defaultFormForPackageLine(line: PcPackageLine): string {
  return quotingFormForProduct(defaultProductForLine(line)) ?? (line === "auto" ? "PA" : line === "flood" ? "FLOOD" : "HO3");
}

export function defaultFormForShopLine(line: ShopLine): string | undefined {
  if (isPcPackageLine(line)) return defaultFormForPackageLine(line);
  return quotingFormForProduct(defaultProductForLine(line));
}

/** Visible Home/Auto/Flood chips. Life/Health/Commercial-only deals stay single-line. */
export function resolveVisiblePackageLines(input: {
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
}): PcPackageLine[] {
  const fromShop = (input.shopLines ?? []).filter(isPcPackageLine);
  if (fromShop.length) return normalizePackageLines(fromShop);
  const fromQuoting = isPcPackageLine(input.quotingLine) ? input.quotingLine : null;
  if (fromQuoting) return [fromQuoting];
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  if (isPcPackageLine(fromLob)) return [fromLob];
  return [];
}

export function resolveActivePackageLine(input: {
  lineParam?: string | null;
  packageLines: readonly PcPackageLine[];
  quotingLine?: string | null;
  lineOfBusiness?: string | null;
}): PcPackageLine | null {
  const lines = normalizePackageLines(input.packageLines.length ? input.packageLines : ["home"]);
  if (!input.packageLines.length) return null;
  const param = (input.lineParam ?? "").trim().toLowerCase();
  if (isPcPackageLine(param) && lines.includes(param)) return param;
  const quoting = (input.quotingLine ?? "").trim().toLowerCase();
  if (isPcPackageLine(quoting) && lines.includes(quoting)) return quoting;
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  if (isPcPackageLine(fromLob) && lines.includes(fromLob)) return fromLob;
  return lines[0] ?? null;
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
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
}): PcPackageLine[] {
  return resolveVisiblePackageLines(input);
}

export function packageCreateDraft(lines: readonly string[] | null | undefined): {
  shopLines: PcPackageLine[];
  primary: PcPackageLine;
  lineOfBusiness: LineOfBusiness;
  quotingLine: PcPackageLine;
  quotingForm: string;
  riskType: "property" | "auto";
} {
  const shopLines = normalizePackageLines(lines);
  const primary = primaryPackageLine(shopLines);
  return {
    shopLines,
    primary,
    lineOfBusiness: lobForPackageLine(primary),
    quotingLine: primary,
    quotingForm: defaultFormForPackageLine(primary),
    riskType: primary === "auto" && shopLines.length === 1 ? "auto" : "property",
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
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
}): string[] {
  const pkg = (input.shopLines ?? []).filter(isPcPackageLine);
  if (pkg.length > 1) return normalizePackageLines(pkg).map(lobForPackageLine);
  const lob = (input.lineOfBusiness ?? "HO").toUpperCase();
  return [lob || "HO"];
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
  logs: readonly { id: string; lineOfBusiness?: string | null }[];
  lob: string;
  isPrimaryLine: boolean;
}): boolean {
  if (!input.quoteAttemptLogId) return input.isPrimaryLine;
  const log = input.logs.find((row) => row.id === input.quoteAttemptLogId);
  if (!log) return input.isPrimaryLine;
  return (log.lineOfBusiness ?? "").toUpperCase() === input.lob.toUpperCase();
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
