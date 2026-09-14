import { lineMatchesOffered } from "./lines";
import type { AppetiteCarrier, CatPosture } from "./types";

/**
 * Per-state overlay on a nationwide (or multi-state) carrier_appetite row.
 * CA HO closed does not imply TX HO closed.
 */
export type AppetiteStateRule = {
  carrierId: string;
  state: string;
  /** Empty = every line in that state. */
  lines: string[];
  catPosture: CatPosture | string | null;
  hardDeclines: string[];
  softCautions: string[];
  preferredSignals: string[];
  notes: string | null;
  researchDated: string | null;
};

export function normalizeRuleState(state: string | null | undefined): string | null {
  const s = state?.trim().toUpperCase() ?? "";
  return s || null;
}

export function stateRuleApplies(
  rule: AppetiteStateRule,
  carrierId: string,
  state: string | null,
  line: string,
): boolean {
  if (rule.carrierId !== carrierId) return false;
  const st = normalizeRuleState(state);
  if (!st || rule.state.toUpperCase() !== st) return false;
  if (rule.lines.length === 0) return true;
  return lineMatchesOffered(line, rule.lines);
}

export function matchStateRule(
  rules: AppetiteStateRule[],
  carrierId: string,
  state: string | null,
  line: string,
): AppetiteStateRule | null {
  return rules.find((rule) => stateRuleApplies(rule, carrierId, state, line)) ?? null;
}

function uniqueTokens(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const token = raw.trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/** Merge overlay tokens/posture onto the catalog row for this snapshot only. */
export function applyStateRule(carrier: AppetiteCarrier, rule: AppetiteStateRule | null): AppetiteCarrier {
  if (!rule) return carrier;
  const notes = [carrier.notesForAgent, rule.notes].filter(Boolean).join(" ");
  return {
    ...carrier,
    catPosture: rule.catPosture ?? carrier.catPosture,
    hardDeclines: uniqueTokens([...carrier.hardDeclines, ...rule.hardDeclines]),
    softCautions: uniqueTokens([...carrier.softCautions, ...rule.softCautions]),
    preferredSignals: uniqueTokens([...carrier.preferredSignals, ...rule.preferredSignals]),
    notesForAgent: notes || null,
  };
}
