/**
 * Florida HO3/HO6/DP routing order (v1).
 * Admin can override via appetite_gate_prefs.fl_ho_order without a code deploy.
 *
 * foremost is included only when mobile / vacant / manufactured.
 * tapco or cabrillo only when admitted markets have already declined.
 */

export const DEFAULT_FL_HO_ORDER = [
  "universal_pc",
  "tower_hill",
  "slide",
  "heritage",
  "american_integrity",
  "kin",
  "typtap",
  "florida_peninsula",
  "security_first",
  "southern_oak",
  "frontline",
  "edison",
  "peoples_trust",
  "olympus",
  "florida_family",
  "foremost",
  "tapco",
  "cabrillo",
  "monarch",
  "loggerhead",
] as const;

export const APPOINTMENT_GATED_SLUGS = ["monarch", "loggerhead"] as const;

/**
 * Citizens last + within-20% rule (business-rule stub).
 * Citizens is not in the FL specialty CSV — do not invent a full catalog row.
 * When an admitted quote exists, Citizens is last and only competitive within this % of the cheapest admitted premium.
 */
export const CITIZENS_SLUG = "citizens";
export const CITIZENS_WITHIN_PCT = 20;
export const CITIZENS_FL_HO_ORDER = 999;

export const NONSTANDARD_AUTO_SLUGS = [
  "dairyland",
  "the_general",
  "infinity",
  "mendota",
] as const;

export const HAGERTY_SLUG = "hagerty";

export const UNIVERSAL_PC_SLUG = "universal_pc";
export const UICNA_SLUG = "uicna";

export function isAppointmentGated(carrierId: string): boolean {
  return (APPOINTMENT_GATED_SLUGS as readonly string[]).includes(carrierId);
}

export function isHoDpLine(line: string): boolean {
  const u = line.trim().toUpperCase();
  return u.startsWith("HO") || u.startsWith("DP") || u === "HO_MP";
}

export function resolveFlHoOrder(override?: string[] | null): string[] {
  if (override && override.length > 0) {
    return override.map((slug) => slug.trim()).filter(Boolean);
  }
  return [...DEFAULT_FL_HO_ORDER];
}

export function defaultFlHoIndex(carrierId: string): number | null {
  const idx = DEFAULT_FL_HO_ORDER.indexOf(carrierId as (typeof DEFAULT_FL_HO_ORDER)[number]);
  return idx >= 0 ? idx : null;
}
