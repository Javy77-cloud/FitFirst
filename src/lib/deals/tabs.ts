export const AGENT_DEAL_TABS = ["documents", "quote-sheet", "markets", "quotes"] as const;
export type AgentDealTab = (typeof AGENT_DEAL_TABS)[number];

/** Master Risk is gone from the Deal. Admin appetite tool stays at /settings/master-risk. */
export const AGENT_DEAL_TAB_LABELS: Record<AgentDealTab, string> = {
  documents: "Documents",
  "quote-sheet": "Quote Sheet",
  markets: "Markets",
  quotes: "Quotes",
};

export function parseAgentDealTab(value: string | undefined | null): AgentDealTab {
  return (AGENT_DEAL_TABS as readonly string[]).includes(value ?? "")
    ? (value as AgentDealTab)
    : "documents";
}

export function isAgentDealTab(value: string | undefined | null): value is AgentDealTab {
  return (AGENT_DEAL_TABS as readonly string[]).includes(value ?? "");
}

/** Ask a teammate is admin-only on other records — never on a Deal tab. */
export function dealTabShowsAsk(_tab?: string | null): boolean {
  return false;
}

/** Manual email / SMS logs stay off Quote Sheet, Markets, and Quotes. */
export function dealTabShowsCommsLogs(tab: string | undefined | null): boolean {
  return parseAgentDealTab(tab) === "documents";
}

/** Email-send is off Quote Sheet (and the other shopping tabs). */
export function dealTabShowsEmailSend(tab: string | undefined | null): boolean {
  return parseAgentDealTab(tab) === "documents";
}
