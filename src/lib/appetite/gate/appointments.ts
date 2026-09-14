import { appointmentLine } from "@/lib/domain";
import { slugFromCarrierName } from "./identity";
import { isHoDpLine } from "./fl-ho-order";
import type { AppetiteCarrier } from "./types";

/** Skip reason when appetite would allow the carrier but the agency is not appointed. */
export const NOT_APPOINTED_RULE = "not_appointed";

export type AppointmentRowInput = {
  /** Desk `carriers.id` UUID. */
  carrierId: string;
  writtenLine: string;
  appointed: boolean;
};

export type DeskCarrierName = {
  id: string;
  name: string;
};

/**
 * Map a quote-gate snapshot line onto `carrier_appointments.written_line`.
 * HO3/HO6/DP* share the Home appointment. Auto variants share AUTO.
 */
export function gateWrittenLine(snapshotLine: string): string {
  if (isHoDpLine(snapshotLine)) return "HO";
  const raw = snapshotLine.trim().toUpperCase();
  if (
    raw === "PAP" ||
    raw === "PA" ||
    raw === "AUTO" ||
    raw === "PERSONAL_AUTO" ||
    raw.includes("COLLECTOR") ||
    raw.includes("CLASSIC_AUTO") ||
    raw.includes("NONSTANDARD")
  ) {
    return "AUTO";
  }
  if (raw === "FLOOD") return "FLOOD";
  return appointmentLine(snapshotLine);
}

/** `false` = not appointed; `true` = appointed; `null` = no row (do not invent a skip). */
export function appointedForCarrier(
  carrierId: string,
  appointedByCarrier?: Record<string, boolean> | null,
): boolean | null {
  if (!appointedByCarrier || !Object.prototype.hasOwnProperty.call(appointedByCarrier, carrierId)) {
    return null;
  }
  return appointedByCarrier[carrierId] ?? null;
}

/**
 * Intersect desk appointments with appetite slugs.
 * Prefer `carrier_appetite.linked_carrier_id`, then conservative name→slug.
 * Missing slug/line rows stay absent — existing seed notes: do not treat a missing row as paper.
 */
export function appointedBySlugFromRows(input: {
  rows: AppointmentRowInput[];
  writtenLine: string;
  catalog: Pick<AppetiteCarrier, "carrierId" | "linkedCarrierId">[];
  deskCarriers: DeskCarrierName[];
}): Record<string, boolean> {
  const want = gateWrittenLine(input.writtenLine);
  const uuidToSlug = new Map<string, string>();

  for (const row of input.catalog) {
    if (row.linkedCarrierId) uuidToSlug.set(row.linkedCarrierId, row.carrierId);
  }
  for (const desk of input.deskCarriers) {
    if (uuidToSlug.has(desk.id)) continue;
    const slug = slugFromCarrierName(desk.name);
    if (slug) uuidToSlug.set(desk.id, slug);
  }

  const result: Record<string, boolean> = {};
  for (const row of input.rows) {
    if (appointmentLine(row.writtenLine) !== want) continue;
    const slug = uuidToSlug.get(row.carrierId);
    if (!slug) continue;
    result[slug] = row.appointed;
  }
  return result;
}
