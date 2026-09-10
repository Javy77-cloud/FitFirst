export const AGENT_DEAL_TABS = ["details", "documents", "markets", "quotes"] as const;
export type AgentDealTab = (typeof AGENT_DEAL_TABS)[number];

/** Master Risk is gone from the Deal. Quote Sheet lives inside Documents. */
export const AGENT_DEAL_TAB_LABELS: Record<AgentDealTab, string> = {
  details: "Deal Details",
  documents: "Documents",
  markets: "Markets",
  quotes: "Quotes",
};

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
  return Object.values(values).some((value) => String(value ?? "").trim().length > 0);
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
 * Fill master sheet must NOT jump to Markets — stay on Documents until the
 * agent checks visual review and hits Confirm & request quotes (quotingUnlocked
 * / quotesRequested). sheetFilled alone is not enough.
 */
export function resolveDealResumeTab(ctx: DealResumeSignals): AgentDealTab {
  const detailsDone = hasMeaningfulDealFieldValues(ctx.recordValues);
  if (!detailsDone) return "details";

  const quotesReady = Boolean(ctx.quotesRequested) || Boolean(ctx.hasNonStubQuotes);
  // Shop already ran → Quotes
  if (quotesReady) return "quotes";

  // Confirm & request quotes unlocks quoting — then Markets is next.
  // sheetFilled alone (Fill master sheet) must stay on Documents for visual review.
  if (Boolean(ctx.quotingUnlocked)) return "markets";

  return "documents";
}

