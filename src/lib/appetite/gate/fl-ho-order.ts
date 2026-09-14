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
 * Citizens is a normal catalog row in the nationals pack (FL residual property).
 * Do not special-case ranking or reintroduce last-resort / within-20% logic.
 * Quoting still depends on agency appointment (sibling appointments work).
 */
export const CITIZENS_SLUG = "citizens";
/** @deprecated leftover v1 stub — ranking does not use this. Sibling PR removes the rule. */
export const CITIZENS_WITHIN_PCT = 20;

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
