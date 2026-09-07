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
