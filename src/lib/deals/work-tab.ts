import { loadRecordValues, writeRecordValues } from "@/lib/custom-fields/store";
import {
  DEAL_WORK_TAB_KEY,
  nextPersistedWorkTab,
  parsePersistedDealWorkTab,
  type AgentDealTab,
} from "@/lib/deals/tabs";

/** Persist the current incomplete Deal work tab so reopen resumes there. */
export async function persistDealWorkTab(dealId: string, tab: AgentDealTab) {
  if (!dealId) return;
  const current = await loadRecordValues(dealId, "deals").catch(() => ({} as Record<string, string>));
  const existing = parsePersistedDealWorkTab(current[DEAL_WORK_TAB_KEY]);
  const next = nextPersistedWorkTab(existing, tab);
  if (next === existing) return;
  await writeRecordValues(dealId, { [DEAL_WORK_TAB_KEY]: next }, "deals");
}
