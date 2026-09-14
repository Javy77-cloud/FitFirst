import { isUsStateCode } from "./states";
import type { MasterRiskSnapshot, QuoteGateResult } from "./types";

/**
 * Learning keys for nationwide appetite.
 *
 * Writes stay tenant-walled. Two agencies in the same state quoting the same
 * carrier_id improve that state's accuracy via a read-time rollup on
 * `sharedStateCarrierKey` — never by dropping tenant_id on insert.
 *
 *   tenantStateCarrierKey  → one agency's book in one state
 *   sharedStateCarrierKey  → all tenants in that state for that carrier
 *
 * `appetite_partitions` is already unique on (tenant_id, state, line).
 */
export function normalizeRiskState(state: string | null | undefined): string | null {
  const s = state?.trim().toUpperCase() ?? "";
  if (!s) return null;
  return isUsStateCode(s) ? s : s;
}

export function normalizeRiskLine(line: string | null | undefined): string | null {
  const s = line?.trim().toUpperCase() ?? "";
  return s || null;
}

export function tenantStateCarrierKey(
  tenantId: string,
  riskState: string | null | undefined,
  carrierId: string,
): string {
  return `${tenantId}:${normalizeRiskState(riskState) ?? "_"}:${carrierId}`;
}

export function sharedStateCarrierKey(riskState: string | null | undefined, carrierId: string): string {
  return `${normalizeRiskState(riskState) ?? "_"}:${carrierId}`;
}

export type QuoteDecisionInsert = {
  tenantId: string;
  carrierId: string;
  dealId: string | null;
  riskId: string | null;
  masterId: string | null;
  status: string;
  matchingRule: string | null;
  riskState: string | null;
  riskLine: string | null;
};

export function quoteDecisionInserts(input: {
  result: QuoteGateResult;
  tenantId: string;
  snapshot?: Pick<MasterRiskSnapshot, "state" | "line" | "dealId" | "riskId" | "masterId"> | null;
  dealId?: string | null;
  riskId?: string | null;
  masterId?: string | null;
  riskState?: string | null;
  riskLine?: string | null;
}): QuoteDecisionInsert[] {
  const snap = input.snapshot;
  const riskState = normalizeRiskState(input.riskState ?? snap?.state ?? null);
  const riskLine = normalizeRiskLine(input.riskLine ?? snap?.line ?? null);
  return input.result.decisions.map((d) => ({
    tenantId: input.tenantId,
    carrierId: d.carrierId,
    dealId: input.dealId ?? snap?.dealId ?? null,
    riskId: input.riskId ?? snap?.riskId ?? null,
    masterId: input.masterId ?? snap?.masterId ?? null,
    status: d.status,
    matchingRule: d.matchingRule,
    riskState,
    riskLine,
  }));
}
