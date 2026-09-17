import {
  classifyCoverageLine,
  type CoverageLine,
} from "@/lib/coverage/gaps";

export type CarrierOfRecord = "us" | "other";

export type CoverageCarrierMap = Partial<Record<CoverageLine, CarrierOfRecord>>;

export type DeclaredCoverageLine = {
  line: CoverageLine;
  carrierOfRecord: CarrierOfRecord | null;
};

/** Lines agents mark on Contact → Coverage. In-force book still wins as “with us”. */
export const CONTACT_COVERAGE_MATRIX_LINES: CoverageLine[] = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "RV",
  "LIFE",
  "HEALTH",
];

/** Persist a picklist-compatible label when the matrix adds a line. */
export const DECLARED_LINE_LABEL: Partial<Record<CoverageLine, string>> = {
  HO: "HO3",
  AUTO: "Auto",
  FLOOD: "NFIP Flood",
  UMBRELLA: "Personal Umbrella",
  GL: "General Liability",
  BOP: "Business Owners Policy (BOP)",
  WC: "Workers' Comp",
  LIFE: "Term Life",
  HEALTH: "Individual Health",
  RV: "RV",
};

export const COVERAGE_CARRIER_FIELD_KEY = "coverage_carrier_of_record";

/**
 * Map CRM / picklist labels onto gap lines.
 * Policy LOB codes still go through classifyCoverageLine; this covers HO6, NFIP Flood, etc.
 */
export function classifyDeclaredCoverageType(raw: string | null | undefined): CoverageLine {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "OTHER";
  const upper = trimmed.toUpperCase().replace(/[_-]+/g, " ");
  if (
    upper === "HOME" ||
    upper === "HOMEOWNERS" ||
    upper === "DWELLING" ||
    upper === "RENTERS" ||
    upper === "CONDO" ||
    /\bHO[0-9]\b/.test(upper) ||
    /\bDP[0-9]\b/.test(upper) ||
    upper.includes("HOMEOWNER") ||
    upper.includes("RENTER") ||
    upper.includes("CONDO") ||
    upper.includes("DWELLING")
  ) {
    return "HO";
  }
  if (
    upper === "BUSINESS / COMMERCIAL" ||
    upper === "BUSINESS" ||
    upper === "COMMERCIAL"
  ) {
    return "GL";
  }
  if (upper.includes("MOTORCYCLE") || upper.includes("RIDESHARE") || upper.includes("CLASSIC")) {
    return "AUTO";
  }
  if (upper.includes("FLOOD") || upper === "NFIP") return "FLOOD";
  if (upper.includes("UMBRELLA") || upper.includes("EXCESS LIABILITY")) return "UMBRELLA";
  if (upper.includes("WORKERS")) return "WC";
  if (upper.includes("BUSINESS OWNERS") || /\bBOP\b/.test(upper)) return "BOP";
  if (upper.includes("GENERAL LIABILITY") || upper === "CGL") return "GL";
  if (
    upper.includes("LIFE") ||
    upper.includes("IUL") ||
    upper.includes("FINAL EXPENSE") ||
    upper.includes("ACCIDENTAL DEATH")
  ) {
    return "LIFE";
  }
  if (
    upper.includes("HEALTH") ||
    upper.includes("MEDICARE") ||
    upper.includes("DENTAL") ||
    upper.includes("VISION") ||
    upper.includes("MEDICAL")
  ) {
    return "HEALTH";
  }
  if (
    /\bRV\b/.test(upper) ||
    upper.includes("REC") ||
    upper.includes("BOAT") ||
    upper.includes("YACHT") ||
    upper.includes("YATCH") ||
    upper.includes("TRAILER") ||
    upper.includes("CAMPER")
  ) {
    return "RV";
  }
  return classifyCoverageLine(trimmed);
}

export function parseExistingCoverageTypes(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializeExistingCoverageTypes(types: readonly string[]): string {
  return types.filter(Boolean).join(",");
}

export function parseCoverageCarrierMap(raw: string | null | undefined): CoverageCarrierMap {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: CoverageCarrierMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const line = classifyDeclaredCoverageType(key);
      if (line === "OTHER") continue;
      if (value === "us" || value === "other") out[line] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeCoverageCarrierMap(map: CoverageCarrierMap): string {
  const clean: CoverageCarrierMap = {};
  for (const [line, value] of Object.entries(map)) {
    if (value === "us" || value === "other") {
      clean[line as CoverageLine] = value;
    }
  }
  return JSON.stringify(clean);
}

export function declaredCoverageFromFields(input: {
  existingCoverageTypes?: string | null;
  carrierOfRecord?: string | null;
}): DeclaredCoverageLine[] {
  const types = parseExistingCoverageTypes(input.existingCoverageTypes);
  const map = parseCoverageCarrierMap(input.carrierOfRecord);
  const byLine = new Map<CoverageLine, CarrierOfRecord | null>();
  for (const type of types) {
    const line = classifyDeclaredCoverageType(type);
    if (line === "OTHER") continue;
    byLine.set(line, map[line] ?? null);
  }
  for (const [line, cor] of Object.entries(map)) {
    if (!cor) continue;
    const typed = line as CoverageLine;
    if (typed === "OTHER") continue;
    if (!byLine.has(typed)) byLine.set(typed, cor);
  }
  return [...byLine.entries()].map(([line, carrierOfRecord]) => ({ line, carrierOfRecord }));
}

export function applyInForceCarrierLock(
  declared: readonly DeclaredCoverageLine[],
  inForceLines: Iterable<CoverageLine>,
): DeclaredCoverageLine[] {
  const byLine = new Map(declared.map((row) => [row.line, { ...row }]));
  for (const line of inForceLines) {
    if (line === "OTHER") continue;
    byLine.set(line, { line, carrierOfRecord: "us" });
  }
  return [...byLine.values()];
}

export function applyCoverageLineChoice(input: {
  line: CoverageLine;
  choice: "us" | "other" | "none";
  existingTypes: readonly string[];
  carrierMap: CoverageCarrierMap;
}): { existingTypes: string[]; carrierMap: CoverageCarrierMap } {
  const kept = input.existingTypes.filter((type) => classifyDeclaredCoverageType(type) !== input.line);
  const map = { ...input.carrierMap };
  delete map[input.line];
  if (input.choice === "none") {
    return { existingTypes: [...kept], carrierMap: map };
  }
  const existingForLine = input.existingTypes.filter(
    (type) => classifyDeclaredCoverageType(type) === input.line,
  );
  const labels = existingForLine.length
    ? existingForLine
    : [DECLARED_LINE_LABEL[input.line] ?? input.line];
  return {
    existingTypes: [...kept, ...labels],
    carrierMap: { ...map, [input.line]: input.choice },
  };
}

export function coverageChoiceForLine(input: {
  line: CoverageLine;
  declared: readonly DeclaredCoverageLine[];
  inForceLines: Iterable<CoverageLine>;
}): "us" | "other" | "none" {
  for (const line of input.inForceLines) {
    if (line === input.line) return "us";
  }
  const row = input.declared.find((item) => item.line === input.line);
  if (!row) return "none";
  if (row.carrierOfRecord === "us") return "us";
  if (row.carrierOfRecord === "other") return "other";
  return "other";
}
