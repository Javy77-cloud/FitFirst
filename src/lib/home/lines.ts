export const HOME_LINE_KEYS = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "COMMERCIAL",
  "HEALTH",
  "LIFE",
] as const;
export type HomeLineKey = (typeof HOME_LINE_KEYS)[number];

/** Personal products the desk can still place on an in-force household. */
export const SELLABLE_LINE_KEYS = ["HO", "AUTO", "FLOOD", "UMBRELLA"] as const;
export type SellableLineKey = (typeof SELLABLE_LINE_KEYS)[number];

export const HOME_LINE_LABEL: Record<HomeLineKey, string> = {
  HO: "Home",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  COMMERCIAL: "Commercial",
  HEALTH: "Health",
  LIFE: "Life",
};

const COMMERCIAL_CODES = new Set(["GL", "BOP", "COMMERCIAL", "CPP", "WC", "CGL", "PACKAGE"]);

export function homeLineKey(lineOfBusiness: string): HomeLineKey | null {
  const raw = lineOfBusiness.trim().toUpperCase();
  if (raw === "HO" || raw === "HO3" || raw === "HO6" || raw === "HOME" || raw === "HOMEOWNERS") return "HO";
  if (raw === "AUTO" || raw === "PA" || raw === "PERSONAL_AUTO") return "AUTO";
  if (raw === "FLOOD" || raw === "NFIP") return "FLOOD";
  if (raw === "UMBRELLA" || raw === "PUM" || raw === "PU") return "UMBRELLA";
  if (raw === "HEALTH" || raw === "ACCIDENT") return "HEALTH";
  if (raw === "LIFE") return "LIFE";
  if (COMMERCIAL_CODES.has(raw)) return "COMMERCIAL";
  return null;
}

export function homeLineLabel(lineOfBusiness: string): string {
  const key = homeLineKey(lineOfBusiness);
  return key ? HOME_LINE_LABEL[key] : lineOfBusiness;
}
