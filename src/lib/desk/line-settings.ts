/** Agency line-of-business toggles, configurable Life/Health subfilters, selling-agency visibility. */

export type LineBook = "life" | "health";

export type LineSubfilterOption = {
  id?: string;
  book: LineBook;
  slug: string;
  label: string;
  sortOrder: number;
};

export type DeskLineSettings = {
  writeLife: boolean;
  writeHealth: boolean;
  showSellingAgency: boolean;
  lifeOptions: LineSubfilterOption[];
  healthOptions: LineSubfilterOption[];
};

export const DEFAULT_LIFE_SUBFILTERS: LineSubfilterOption[] = [
  { book: "life", slug: "term_life", label: "Term Life", sortOrder: 0 },
  { book: "life", slug: "whole_life", label: "Whole Life", sortOrder: 1 },
  { book: "life", slug: "iul", label: "IUL", sortOrder: 2 },
  { book: "life", slug: "final_expense", label: "Final Expense", sortOrder: 3 },
];

export const DEFAULT_HEALTH_SUBFILTERS: LineSubfilterOption[] = [
  { book: "health", slug: "marketplace", label: "Marketplace", sortOrder: 0 },
  { book: "health", slug: "medicare_advantage", label: "Medicare Advantage", sortOrder: 1 },
  { book: "health", slug: "medicare_ab", label: "Medicare A&B", sortOrder: 2 },
  { book: "health", slug: "supplemental", label: "Supplemental", sortOrder: 3 },
];

export const DEFAULT_DESK_LINE_SETTINGS: DeskLineSettings = {
  writeLife: true,
  writeHealth: true,
  showSellingAgency: false,
  lifeOptions: DEFAULT_LIFE_SUBFILTERS,
  healthOptions: DEFAULT_HEALTH_SUBFILTERS,
};

const SUBFILTER_ALIASES: Record<string, string[]> = {
  term_life: ["term life", "term"],
  whole_life: ["whole life", "whole"],
  iul: ["iul", "indexed universal life", "indexed universal life (iul)"],
  final_expense: ["final expense"],
  marketplace: ["marketplace", "aca", "on-exchange"],
  medicare_advantage: ["medicare advantage", "mapd"],
  medicare_ab: [
    "medicare a&b",
    "medicare a & b",
    "medicare a and b",
    "medicare parts a",
    "medicare part a",
    "original medicare",
  ],
  supplemental: ["supplemental", "supplemental health", "medigap", "medicare supplement"],
};

export function slugifySubfilter(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return slug || "option";
}

export function optionsForBook(settings: DeskLineSettings, book: LineBook): LineSubfilterOption[] {
  return book === "life" ? settings.lifeOptions : settings.healthOptions;
}

export function visiblePolicyBooks(settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">) {
  const books: Array<{ id: "all" | "pc" | "life" | "health"; label: string }> = [
    { id: "all", label: "All families" },
    { id: "pc", label: "P&C" },
  ];
  if (settings.writeLife) books.push({ id: "life", label: "Life" });
  if (settings.writeHealth) books.push({ id: "health", label: "Health" });
  return books;
}

export function isHiddenLine(line: string, settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">) {
  const raw = line.trim().toUpperCase();
  if ((raw === "LIFE" || raw === "life") && !settings.writeLife) return true;
  if ((raw === "HEALTH" || raw === "health") && !settings.writeHealth) return true;
  return false;
}

export function visibleLines<T extends string>(
  lines: readonly T[],
  settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">,
): T[] {
  return lines.filter((line) => !isHiddenLine(line, settings));
}

export function visibleShopLines<T extends string>(
  lines: readonly T[],
  settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">,
): T[] {
  return lines.filter((line) => {
    if (line === "life" && !settings.writeLife) return false;
    if (line === "health" && !settings.writeHealth) return false;
    return true;
  });
}

export function visiblePipelineBoards<T extends { slug: string }>(
  boards: T[],
  settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">,
): T[] {
  return boards.filter((board) => {
    if (board.slug === "life" && !settings.writeLife) return false;
    if (board.slug === "health" && !settings.writeHealth) return false;
    return true;
  });
}

export function fallbackPipelineSlug(
  requested: string | null | undefined,
  settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">,
): string {
  const slug = requested?.trim() || "p-c";
  if (slug === "life" && !settings.writeLife) return "p-c";
  if (slug === "health" && !settings.writeHealth) return "p-c";
  return slug;
}

export function lineForPipelineSlug(slug: string): string {
  if (slug === "life") return "LIFE";
  if (slug === "health") return "HEALTH";
  if (slug === "flood") return "FLOOD";
  return "HO";
}

export function normalizeMatchText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ");
}

export function matchesSubfilter(
  value: string | null | undefined,
  option: Pick<LineSubfilterOption, "slug" | "label">,
): boolean {
  const raw = normalizeMatchText(value);
  if (!raw) return false;
  const label = normalizeMatchText(option.label);
  const slug = option.slug.trim().toLowerCase().replace(/_/g, " ");
  if (raw === label || raw === slug) return true;
  if (label && (raw.includes(label) || label.includes(raw))) return true;
  if (slug && (raw.includes(slug) || slug.includes(raw))) return true;
  const aliases = SUBFILTER_ALIASES[option.slug] ?? [];
  return aliases.some((alias) => raw === alias || raw.includes(alias));
}

export function findSubfilter(
  value: string | null | undefined,
  options: Array<Pick<LineSubfilterOption, "slug" | "label">>,
): Pick<LineSubfilterOption, "slug" | "label"> | null {
  return options.find((option) => matchesSubfilter(value, option)) ?? null;
}

export function matchesLifeOrHealthSub(
  value: string | null | undefined,
  slug: string | null | undefined,
  options: LineSubfilterOption[],
): boolean {
  if (!slug || slug === "all") return true;
  const option = options.find((row) => row.slug === slug);
  if (!option) return false;
  return matchesSubfilter(value, option);
}

export function filterLineMix<T extends { key: string }>(
  slices: T[],
  settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">,
): T[] {
  return slices.filter((slice) => {
    if (slice.key === "LIFE" && !settings.writeLife) return false;
    if (slice.key === "HEALTH" && !settings.writeHealth) return false;
    return true;
  });
}

export function deskNavExtras(settings: Pick<DeskLineSettings, "writeLife" | "writeHealth">) {
  const extras: Array<{ href: string; label: string }> = [];
  if (settings.writeLife) extras.push({ href: "/deals?pipeline=life", label: "Life" });
  if (settings.writeHealth) extras.push({ href: "/deals?pipeline=health", label: "Health" });
  return extras;
}
