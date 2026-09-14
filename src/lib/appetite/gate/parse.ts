import { parseCsv, parseBool } from "@/lib/import-export/csv";
import { defaultFlHoIndex } from "./fl-ho-order";
import { splitPipeList } from "./lines";
import { expandStatesAvailable, needsStateConfirmNote } from "./states";
import type { AppetiteStateRule } from "./state-rules";
import type { AppetiteCarrier, CarrierSegment, CatPosture } from "./types";

export const APPETITE_FL_SPECIALTY_CSV = "data/appetite/fitfirst-fl-specialty-appetite.csv";
export const APPETITE_NATIONALS_CSV = "data/appetite/fitfirst-nationals-appetite.csv";
export const APPETITE_NATIONALS_STATE_RULES_CSV = "data/appetite/fitfirst-nationals-state-rules.csv";
/** @deprecated use APPETITE_FL_SPECIALTY_CSV — kept so existing import/tests keep working. */
export const APPETITE_CSV_RELATIVE_PATH = APPETITE_FL_SPECIALTY_CSV;

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

export function parseAppetiteStateRulesCsv(text: string): AppetiteStateRule[] {
  const { rows } = parseCsv(text);
  const byKey = new Map<string, AppetiteStateRule>();

  for (const row of rows) {
    const carrierId = String(row.carrier_id ?? "").trim();
    const state = String(row.state ?? "").trim().toUpperCase();
    if (!carrierId || !state) continue;
    const key = `${carrierId}:${state}`;
    if (byKey.has(key)) {
      throw new Error(`Duplicate appetite state rule in CSV: ${key}`);
    }
    const posture = String(row.cat_posture ?? "").trim();
    byKey.set(key, {
      carrierId,
      state,
      lines: splitPipeList(row.lines),
      catPosture: posture || null,
      hardDeclines: splitPipeList(row.hard_declines),
      softCautions: splitPipeList(row.soft_cautions),
      preferredSignals: splitPipeList(row.preferred_signals),
      notes: String(row.notes ?? "").trim() || null,
      researchDated: String(row.research_dated ?? "").trim() || null,
    });
  }

  return [...byKey.values()];
}

/** Companion overlay file next to a nationals appetite CSV, if present. */
export function companionStateRulesPath(csvPath: string): string | null {
  const normalized = csvPath.replace(/\\/g, "/");
  if (normalized.endsWith("fitfirst-nationals-appetite.csv")) {
    return normalized.replace(/fitfirst-nationals-appetite\.csv$/, "fitfirst-nationals-state-rules.csv");
  }
  return null;
}
