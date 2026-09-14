/** Agent policy detail tabs — chip bar; Claims/Agency are conditional. */

export const AGENT_POLICY_TABS = [
  "overview",
  "coverage",
  "endorsements",
  "billing",
  "documents",
  "activity",
  "claims",
  "agency",
] as const;

export type AgentPolicyTab = (typeof AGENT_POLICY_TABS)[number];

export const AGENT_POLICY_TAB_LABELS: Record<AgentPolicyTab, string> = {
  overview: "Overview",
  coverage: "Coverage",
  endorsements: "Endorsements",
  billing: "Billing & Payments",
  documents: "Documents",
  activity: "Activity & Timeline",
  claims: "Claims",
  agency: "Agency",
};

/** Always shown to agents (Claims added only when rows exist). */
export const AGENT_POLICY_CORE_TABS = [
  "overview",
  "coverage",
  "endorsements",
  "billing",
  "documents",
  "activity",
] as const satisfies readonly AgentPolicyTab[];

const LEGACY_TAB_ALIASES: Record<string, AgentPolicyTab> = {
  details: "overview",
  info: "overview",
  payments: "billing",
  files: "documents",
  timeline: "activity",
  work: "agency",
};

export function parseAgentPolicyTab(
  value: string | undefined | null,
  opts?: { hasClaims?: boolean; isAdmin?: boolean; showAgencyTab?: boolean },
): AgentPolicyTab {
  const raw = value ?? "";
  const aliased = (AGENT_POLICY_TABS as readonly string[]).includes(raw)
    ? (raw as AgentPolicyTab)
    : (LEGACY_TAB_ALIASES[raw] ?? "overview");

  if (aliased === "claims" && !opts?.hasClaims) return "overview";
  const agencyOk = Boolean(opts?.isAdmin || opts?.showAgencyTab);
  if (aliased === "agency" && !agencyOk) return "overview";
  return aliased;
}

export function policyTabsForViewer(opts: {
  hasClaims: boolean;
  isAdmin: boolean;
  /** Agents with lifecycle/commission access see Agency without Admin-only chrome. */
  showAgencyTab?: boolean;
}): AgentPolicyTab[] {
  const tabs: AgentPolicyTab[] = [...AGENT_POLICY_CORE_TABS];
  if (opts.hasClaims) tabs.push("claims");
  if (opts.isAdmin || opts.showAgencyTab) tabs.push("agency");
  return tabs;
}
