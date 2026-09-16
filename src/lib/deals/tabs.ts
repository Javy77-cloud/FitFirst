export const AGENT_DEAL_TABS = ["details", "documents", "markets", "quotes"] as const;
export type AgentDealTab = (typeof AGENT_DEAL_TABS)[number];

/** Master Risk is gone from the Deal. Quote Sheet lives inside Documents. */
export const AGENT_DEAL_TAB_LABELS: Record<AgentDealTab, string> = {
  details: "Deal Details",
  documents: "Documents",
  markets: "Markets",
  quotes: "Quotes",
};

/** Reserved custom-field key — current incomplete work tab. Not a layout field. */
export const DEAL_WORK_TAB_KEY = "ff_work_tab";

const LEGACY_TAB_ALIASES: Record<string, AgentDealTab> = {
  "quote-sheet": "documents",
  sheet: "documents",
  risk: "documents",
  "master-risk": "documents",
};

export function parseAgentDealTab(value: string | undefined | null): AgentDealTab {
  const raw = value ?? "";
  if ((AGENT_DEAL_TABS as readonly string[]).includes(raw)) return raw as AgentDealTab;
  return LEGACY_TAB_ALIASES[raw] ?? "details";
}

export function isAgentDealTab(value: string | undefined | null): value is AgentDealTab {
  return (AGENT_DEAL_TABS as readonly string[]).includes(value ?? "");
}

export function parsePersistedDealWorkTab(
  value: string | null | undefined,
): AgentDealTab | null {
  const raw = String(value ?? "").trim();
  return isAgentDealTab(raw) ? raw : null;
}

export function persistedDealWorkTab(
  values: Record<string, string | null | undefined> | null | undefined,
): AgentDealTab | null {
  return parsePersistedDealWorkTab(values?.[DEAL_WORK_TAB_KEY]);
}

/** Persist only advances — never moves an in-progress deal backward. */
export function nextPersistedWorkTab(
  existing: AgentDealTab | null | undefined,
  incoming: AgentDealTab,
): AgentDealTab {
  if (!existing) return incoming;
  return AGENT_DEAL_TABS.indexOf(incoming) > AGENT_DEAL_TABS.indexOf(existing) ? incoming : existing;
}

/** Ask a teammate is admin-only on other records — never on a Deal tab. */
export function dealTabShowsAsk(_tab?: string | null): boolean {
  return false;
}

/** Manual email / SMS logs stay off Markets and Quotes. */
export function dealTabShowsCommsLogs(tab: string | undefined | null): boolean {
  return parseAgentDealTab(tab) === "documents";
}

/** Email-send is off the shopping tabs. */
export function dealTabShowsEmailSend(tab: string | undefined | null): boolean {
  return parseAgentDealTab(tab) === "documents";
}

/** True when Deal Details has at least one non-empty saved field value. */
export function hasMeaningfulDealFieldValues(
  values: Record<string, string | null | undefined> | null | undefined,
): boolean {
  if (!values) return false;
  return Object.entries(values).some(([key, value]) => {
    if (key === DEAL_WORK_TAB_KEY) return false;
    return String(value ?? "").trim().length > 0;
  });
}

export type DealResumeSignals = {
  /** Custom field values from loadRecordValues (empty / blank-only → details). */
  recordValues?: Record<string, string | null | undefined> | null;
  /** Deal is unlocked for quoting (Approve master sheet). */
  quotingUnlocked?: boolean | null;
  /** Master sheet has meaningful fill (sheetHasMarketFacts). */
  sheetFilled?: boolean | null;
  /** True when Confirm & request / shop ran (hasShopMarketAction / explicit logs). */
  quotesRequested?: boolean | null;
  /** Any non-stub quote row exists. */
  hasNonStubQuotes?: boolean | null;
};

/**
 * Next unfinished Deal tab when the URL has no explicit `?tab=`.
 * Manual `?tab=` clicks still win via parseAgentDealTab on the page.
 *
 * Persisted `ff_work_tab` is the source of truth once convert / a stage
 * completion wrote it — so a convert that already copied lead fields still
 * lands on Details, and reopen stays on Markets until quotes are requested.
 *
 * Without a persisted tab (older deals), infer from sheet / shop signals.
 * Fill master sheet must NOT jump to Markets — stay on Documents until the
 * agent checks visual review and hits Confirm & request quotes.
 */
export function resolveDealResumeTab(ctx: DealResumeSignals): AgentDealTab {
  const quotesReady = Boolean(ctx.quotesRequested) || Boolean(ctx.hasNonStubQuotes);
  if (quotesReady) return "quotes";

  const persisted = persistedDealWorkTab(ctx.recordValues);
  if (persisted) return persisted;

  const detailsDone = hasMeaningfulDealFieldValues(ctx.recordValues);
  if (!detailsDone) return "details";

  if (Boolean(ctx.quotingUnlocked)) return "markets";

  return "documents";
}
