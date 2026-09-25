/**
 * DEC rating occupancy for the home Overview slot.
 * Owner, Tenant, and Owner Occupied normalize. Other printed text stays.
 * An omitted value stays blank. An explicit blank token is None.
 */

export function normalizeRatingOccupancy(raw: string | null | undefined): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/^(none|n\/a|na|null|—|-)$/i.test(text)) return "None";
  const lower = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (lower === "y" || lower === "yes" || lower === "true") return "Yes";
  if (lower === "n" || lower === "no" || lower === "false") return "No";
  if (lower === "owner" || lower === "owner occupied") return "Owner";
  if (lower === "tenant" || lower === "tenant occupied") return "Tenant";
  return text;
}

/**
 * Prefer a printed Occupancy line. Use Type of Residence only when occupancy
 * was omitted and that residence is Owner or Tenant (including Owner Occupied).
 * An explicit None does not fall through.
 */
export function ratingOccupancyValue(
  occupancy: string | null | undefined,
  typeOfResidence?: string | null | undefined,
): string {
  const explicit = normalizeRatingOccupancy(occupancy);
  if (explicit) return explicit;
  const fromResidence = normalizeRatingOccupancy(typeOfResidence);
  if (fromResidence === "Owner" || fromResidence === "Tenant") return fromResidence;
  return "";
}
