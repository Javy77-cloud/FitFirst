/** Canonical agency line-of-business master list. Deals, policies, and forms bind to one code. */

export type AgencyLineFamily = "pc" | "life" | "health";

export type AgencyLine = {
  id?: string;
  code: string;
  label: string;
  family: AgencyLineFamily;
  active: boolean;
  sortOrder: number;
  aliases: string[];
  system: boolean;
};

export type AgencyLineOption = {
  value: string;
  label: string;
  family: AgencyLineFamily;
  orphan?: boolean;
};

export type AgencyLineOrphan = {
  raw: string;
  count: number;
};

const FAMILY_VALUES = new Set<AgencyLineFamily>(["pc", "life", "health"]);

export function isAgencyLineFamily(value: string | null | undefined): value is AgencyLineFamily {
  return Boolean(value && FAMILY_VALUES.has(value as AgencyLineFamily));
}

export function parseAgencyLineFamily(value: string | null | undefined): AgencyLineFamily {
  return isAgencyLineFamily(value) ? value : "pc";
}

/** Seed catalog — same codes as `LINES`, plus aliases for forms / free-text / products. */
export const DEFAULT_AGENCY_LINES: AgencyLine[] = [
  {
    code: "HO",
    label: "Homeowners",
    family: "pc",
    active: true,
    sortOrder: 0,
    system: true,
    aliases: [
      "home",
      "homeowners",
      "homeowner",
      "ho3",
      "ho4",
      "ho5",
      "ho6",
      "ho8",
      "mho",
      "mdp",
      "mh",
      "dp",
      "dp1",
      "dp3",
      "renters",
      "landlord",
      "dwelling",
    ],
  },
  {
    code: "AUTO",
    label: "Auto",
    family: "pc",
    active: true,
    sortOrder: 1,
    system: true,
    aliases: [
      "pa",
      "personal auto",
      "car",
      "motorcycle",
      "ca",
      "commercial auto",
      "commercial_auto",
    ],
  },
  {
    code: "FLOOD",
    label: "Flood",
    family: "pc",
    active: true,
    sortOrder: 2,
    system: true,
    aliases: ["nfip", "flood insurance"],
  },
  {
    code: "UMBRELLA",
    label: "Umbrella",
    family: "pc",
    active: true,
    sortOrder: 3,
    system: true,
    aliases: ["pumb", "excess", "personal umbrella"],
  },
  {
    code: "RV",
    label: "Rec / RV",
    family: "pc",
    active: true,
    sortOrder: 4,
    system: true,
    aliases: ["rec", "rec rv", "rec_rv", "boat", "boat/watercraft", "watercraft"],
  },
  {
    code: "GL",
    label: "General liability",
    family: "pc",
    active: true,
    sortOrder: 5,
    system: true,
    aliases: ["general liability", "cgl"],
  },
  {
    code: "BOP",
    label: "BOP",
    family: "pc",
    active: true,
    sortOrder: 6,
    system: true,
    aliases: ["business owners", "business owner's", "business owners policy"],
  },
  {
    code: "WC",
    label: "Workers Comp",
    family: "pc",
    active: true,
    sortOrder: 7,
    system: true,
    aliases: ["workers_comp", "workers comp", "workers' comp", "work comp"],
  },
  {
    code: "LIFE",
    label: "Life",
    family: "life",
    active: true,
    sortOrder: 8,
    system: true,
    aliases: ["term life", "whole life", "iul", "final expense", "universal life"],
  },
  {
    code: "HEALTH",
    label: "Health",
    family: "health",
    active: true,
    sortOrder: 9,
    system: true,
    aliases: ["marketplace", "medicare", "medicare advantage", "aca", "medigap", "supplemental"],
  },
];

export function normalizeLineKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyLineCode(label: string): string {
  const slug = label
    .trim()
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
  return slug || "LINE";
}

export function resolveAgencyLine(
  value: string | null | undefined,
  lines: readonly AgencyLine[],
): AgencyLine | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const key = normalizeLineKey(raw);
  if (!key) return null;
  const upper = raw.toUpperCase();
  const byCode = lines.find((line) => line.code.toUpperCase() === upper);
  if (byCode) return byCode;
  const byLabel = lines.find((line) => normalizeLineKey(line.label) === key);
  if (byLabel) return byLabel;
  return (
    lines.find((line) => line.aliases.some((alias) => normalizeLineKey(alias) === key)) ?? null
  );
}

/** Map a stored / typed value onto the master code. Unknown values stay as-is (no data loss). */
export function canonicalizeLineCode(
  value: string | null | undefined,
  lines: readonly AgencyLine[],
): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return resolveAgencyLine(raw, lines)?.code ?? raw;
}

export function requireAgencyLineCode(
  value: string | null | undefined,
  lines: readonly AgencyLine[],
  fallback = "HO",
): string {
  return resolveAgencyLine(value, lines)?.code ?? fallback;
}

export function isKnownAgencyLine(
  value: string | null | undefined,
  lines: readonly AgencyLine[],
): boolean {
  return resolveAgencyLine(value, lines) != null;
}

export function visibleAgencyLines(
  lines: readonly AgencyLine[],
  settings?: { writeLife?: boolean; writeHealth?: boolean } | null,
  opts?: { includeInactive?: boolean },
): AgencyLine[] {
  return lines
    .filter((line) => {
      if (!opts?.includeInactive && !line.active) return false;
      if (line.family === "life" && settings && settings.writeLife === false) return false;
      if (line.family === "health" && settings && settings.writeHealth === false) return false;
      return true;
    })
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function agencyLineSelectOptions(
  lines: readonly AgencyLine[],
  settings?: { writeLife?: boolean; writeHealth?: boolean } | null,
  current?: string | null,
): AgencyLineOption[] {
  const visible = visibleAgencyLines(lines, settings);
  const options: AgencyLineOption[] = visible.map((line) => ({
    value: line.code,
    label: `${line.label} (${line.code})`,
    family: line.family,
  }));
  const raw = (current ?? "").trim();
  if (raw && !options.some((row) => row.value === raw) && !resolveAgencyLine(raw, lines)) {
    options.unshift({
      value: raw,
      label: `${raw} · not on list`,
      family: "pc",
      orphan: true,
    });
  }
  return options;
}

export function findAgencyLineOrphans(
  values: readonly string[],
  lines: readonly AgencyLine[],
): AgencyLineOrphan[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const raw = value.trim();
    if (!raw) continue;
    if (resolveAgencyLine(raw, lines)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([raw, count]) => ({ raw, count }))
    .sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw));
}

export const AGENCY_LINE_FAMILY_LABEL: Record<AgencyLineFamily, string> = {
  pc: "P&C",
  life: "Life",
  health: "Health",
};

export function agencyLineFamilyCounts(lines: readonly AgencyLine[]) {
  return {
    pc: lines.filter((line) => line.family === "pc" && line.active).length,
    life: lines.filter((line) => line.family === "life" && line.active).length,
    health: lines.filter((line) => line.family === "health" && line.active).length,
    inactive: lines.filter((line) => !line.active).length,
  };
}
