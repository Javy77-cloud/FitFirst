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

/** Commercial PC package — GL / Workers' Comp / BOP. Not Life/Health. Not Commercial Auto. */
export const COMMERCIAL_PACKAGE_LINES = ["general_liability", "workers_comp", "bop"] as const;
export type CommercialPackageLine = (typeof COMMERCIAL_PACKAGE_LINES)[number];

export type PackageLine = PcPackageLine | CommercialPackageLine;
export type PackageFamily = "personal" | "commercial";

export const PC_PACKAGE_LINE_LABELS: Record<PcPackageLine, string> = {
  home: "Home",
  auto: "Auto",
  flood: "Flood",
};

export const COMMERCIAL_PACKAGE_LINE_LABELS: Record<CommercialPackageLine, string> = {
  general_liability: "GL",
  workers_comp: "Workers' Comp",
  bop: "BOP",
};

export const PACKAGE_LINE_LABELS: Record<PackageLine, string> = {
  ...PC_PACKAGE_LINE_LABELS,
  ...COMMERCIAL_PACKAGE_LINE_LABELS,
};

const PACKAGE_SET = new Set<string>(PC_PACKAGE_LINES);
const COMMERCIAL_PACKAGE_SET = new Set<string>(COMMERCIAL_PACKAGE_LINES);

export function isPcPackageLine(value: string | null | undefined): value is PcPackageLine {
  return Boolean(value && PACKAGE_SET.has(value));
}

export function isCommercialPackageLine(
  value: string | null | undefined,
): value is CommercialPackageLine {
  return Boolean(value && COMMERCIAL_PACKAGE_SET.has(value));
}

export function isPackageLine(value: string | null | undefined): value is PackageLine {
  return isPcPackageLine(value) || isCommercialPackageLine(value);
}

/** Personal family if any Home/Auto/Flood is present; else commercial when GL/WC/BOP only. */
export function packageFamilyOf(selected: readonly string[] | null | undefined): PackageFamily {
  let hasPersonal = false;
  let hasCommercial = false;
  for (const raw of selected ?? []) {
    const value = String(raw ?? "").trim().toLowerCase();
    if (isPcPackageLine(value)) hasPersonal = true;
    if (isCommercialPackageLine(value)) hasCommercial = true;
  }
  if (hasCommercial && !hasPersonal) return "commercial";
  return "personal";
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

/** Default GL when nothing is checked. Order is GL → Workers' Comp → BOP. */
export function normalizeCommercialPackageLines(
  selected: readonly string[] | null | undefined,
): CommercialPackageLine[] {
  const picked = new Set<CommercialPackageLine>();
  for (const raw of selected ?? []) {
    const value = String(raw ?? "").trim().toLowerCase();
    if (isCommercialPackageLine(value)) picked.add(value);
  }
  const ordered = COMMERCIAL_PACKAGE_LINES.filter((line) => picked.has(line));
  return ordered.length ? ordered : ["general_liability"];
}

/** Personal or commercial — does not mix families. Empty defaults to Home. */
export function normalizeSelectedPackageLines(
  selected: readonly string[] | null | undefined,
): PackageLine[] {
  if (packageFamilyOf(selected) === "commercial") return normalizeCommercialPackageLines(selected);
  return normalizePackageLines(selected);
}

function rawShopLinesFromForm(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): string[] {
  if (!form) return [];
  const many = typeof form.getAll === "function" ? form.getAll("shopLines") : [];
  const raw = (many ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
  if (!raw.length && typeof form.get === "function") {
    const single = String(form.get("shopLines") ?? "").trim();
    if (single) raw.push(...single.split(","));
  }
  return raw;
}

export function packageLinesFromForm(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): PackageLine[] {
  if (!form) return ["home"];
  const raw = rawShopLinesFromForm(form);
  if (!raw.length) return ["home"];
  return normalizeSelectedPackageLines(raw);
}

export function packageLinesFromFormOrUndefined(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): PackageLine[] | undefined {
  if (!form) return undefined;
  const raw = rawShopLinesFromForm(form);
  if (!raw.length) return undefined;
  return normalizeSelectedPackageLines(raw);
}

export function primaryPackageLine(lines: readonly string[]): PackageLine {
  return normalizeSelectedPackageLines(lines)[0] ?? "home";
}

export function lobForPackageLine(line: PackageLine): LineOfBusiness {
  return SHOP_LINE_TO_LOB[line];
}

export function defaultFormForPackageLine(line: PackageLine): string {
  const fromProduct = quotingFormForProduct(defaultProductForLine(line));
  if (fromProduct) return fromProduct;
  if (line === "auto") return "PA";
  if (line === "flood") return "FLOOD";
  if (line === "workers_comp") return "WC";
  if (line === "bop") return "BOP";
  if (line === "general_liability") return "GL";
  return "HO3";
}

export function defaultFormForShopLine(line: ShopLine): string | undefined {
  if (isPcPackageLine(line)) return defaultFormForPackageLine(line);
  return quotingFormForProduct(defaultProductForLine(line));
}

/** Visible package chips. Personal Home/Auto/Flood wins over companion GL/WC. Life/Health stay single-line. */
export function resolveVisiblePackageLines(input: {
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
}): PackageLine[] {
  const fromPersonal = (input.shopLines ?? []).filter(isPcPackageLine);
  if (fromPersonal.length) return normalizePackageLines(fromPersonal);
  const fromCommercial = (input.shopLines ?? []).filter(isCommercialPackageLine);
  if (fromCommercial.length) return normalizeCommercialPackageLines(fromCommercial);
  if (isPcPackageLine(input.quotingLine)) return [input.quotingLine];
  if (isCommercialPackageLine(input.quotingLine)) return [input.quotingLine];
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  if (isPcPackageLine(fromLob) || isCommercialPackageLine(fromLob)) return [fromLob];
  return [];
}

export function resolveActivePackageLine(input: {
  lineParam?: string | null;
  packageLines: readonly PackageLine[];
  quotingLine?: string | null;
  lineOfBusiness?: string | null;
}): PackageLine | null {
  if (!input.packageLines.length) return null;
  const lines = normalizeSelectedPackageLines(input.packageLines);
  const param = (input.lineParam ?? "").trim().toLowerCase();
  if (isPackageLine(param) && lines.includes(param)) return param;
  const quoting = (input.quotingLine ?? "").trim().toLowerCase();
  if (isPackageLine(quoting) && lines.includes(quoting)) return quoting;
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  if (isPackageLine(fromLob) && lines.includes(fromLob)) return fromLob;
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

/** Keep the other family's shop lines when the agent edits this package. */
export function mergePackageShopLines(
  existing: readonly string[] | null | undefined,
  nextPackage: readonly string[] | null | undefined,
): ShopLine[] {
  const family = packageFamilyOf(nextPackage);
  const inFamily =
    family === "commercial" ? isCommercialPackageLine : isPcPackageLine;
  const extras = (existing ?? []).filter(
    (line): line is ShopLine => isShopLine(line) && !inFamily(line),
  );
  const next =
    family === "commercial"
      ? normalizeCommercialPackageLines(nextPackage)
      : normalizePackageLines(nextPackage);
  return [...next, ...extras];
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

/** Cascade form save: switching to Commercial drops personal package lines so chips follow GL/WC/BOP. */
export function shopLinesAfterCascadeForm(
  existing: readonly string[] | null | undefined,
  formShopLine: string | null | undefined,
): ShopLine[] {
  if (isCommercialPackageLine(formShopLine)) {
    const keep = (existing ?? []).filter((line) => isShopLine(line) && !isPcPackageLine(line));
    return mergeShopLinesKeepExisting(keep, [formShopLine]);
  }
  if (isPcPackageLine(formShopLine)) {
    return mergeShopLinesKeepExisting(existing, [formShopLine]);
  }
  return isShopLine(formShopLine)
    ? mergeShopLinesKeepExisting(existing, [formShopLine])
    : mergeShopLinesKeepExisting(existing, []);
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
}): PackageLine[] {
  return resolveVisiblePackageLines(input);
}

export function packageCreateDraft(lines: readonly string[] | null | undefined): {
  shopLines: PackageLine[];
  primary: PackageLine;
  lineOfBusiness: LineOfBusiness;
  quotingLine: PackageLine;
  quotingForm: string;
  riskType: "property" | "auto";
  family: PackageFamily;
  accountKind: "personal" | "commercial";
  bindTarget: "contact" | "account";
} {
  const shopLines = normalizeSelectedPackageLines(lines);
  const primary = primaryPackageLine(shopLines);
  const family = packageFamilyOf(shopLines);
  return {
    shopLines,
    primary,
    lineOfBusiness: lobForPackageLine(primary),
    quotingLine: primary,
    quotingForm: defaultFormForPackageLine(primary),
    riskType: primary === "auto" && shopLines.length === 1 ? "auto" : "property",
    family,
    accountKind: family === "commercial" ? "commercial" : "personal",
    bindTarget: family === "commercial" ? "account" : "contact",
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
  const personal = (input.shopLines ?? []).filter(isPcPackageLine);
  if (personal.length > 1) return normalizePackageLines(personal).map(lobForPackageLine);
  const commercial = (input.shopLines ?? []).filter(isCommercialPackageLine);
  if (commercial.length > 1) {
    return normalizeCommercialPackageLines(commercial).map(lobForPackageLine);
  }
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
