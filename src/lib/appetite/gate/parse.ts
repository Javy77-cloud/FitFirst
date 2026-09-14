import { parseCsv, parseBool } from "@/lib/import-export/csv";
import { defaultFlHoIndex } from "./fl-ho-order";
import { splitPipeList } from "./lines";
import { expandStatesAvailable, needsStateConfirmNote } from "./states";
import type { AppetiteCarrier, CarrierSegment, CatPosture } from "./types";

export const APPETITE_CSV_RELATIVE_PATH = "data/appetite/fitfirst-fl-specialty-appetite.csv";

export function parseAppetiteCsv(text: string): AppetiteCarrier[] {
  const { rows } = parseCsv(text);
  const bySlug = new Map<string, AppetiteCarrier>();

  for (const row of rows) {
    const carrierId = String(row.carrier_id ?? "").trim();
    if (!carrierId) continue;
    if (bySlug.has(carrierId)) {
      throw new Error(`Duplicate carrier_id in appetite CSV: ${carrierId}`);
    }

    const geo = expandStatesAvailable(String(row.states_available ?? ""));
    const notes = needsStateConfirmNote(String(row.notes_for_agent ?? ""), geo.needsStateConfirm);
    const flHoOrder = defaultFlHoIndex(carrierId);

    bySlug.set(carrierId, {
      carrierId,
      legalName: String(row.legal_name ?? "").trim(),
      segment: String(row.segment ?? "").trim() as CarrierSegment,
      linesOffered: splitPipeList(row.lines_offered),
      linesNotOffered: splitPipeList(row.lines_not_offered),
      statesAvailable: geo.states,
      statesRestricted: [],
      statesRaw: geo.raw,
      portalName: String(row.portal_name ?? "").trim() || null,
      csPhone: String(row.cs_phone ?? "").trim() || null,
      claimsPhone: String(row.claims_phone ?? "").trim() || null,
      rateable: parseBool(row.rateable, true),
      hardDeclines: splitPipeList(row.hard_declines),
      softCautions: splitPipeList(row.soft_cautions),
      preferredSignals: splitPipeList(row.preferred_signals),
      catPosture: String(row.cat_posture ?? "selective").trim() as CatPosture,
      notesForAgent: notes || null,
      quotePriority: flHoOrder,
      flHoOrder,
      needsStateConfirm: geo.needsStateConfirm,
    });
  }

  return [...bySlug.values()];
}
