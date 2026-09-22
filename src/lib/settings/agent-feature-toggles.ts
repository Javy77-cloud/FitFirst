/**
 * Agency → agent feature toggles (People & access).
 *
 * Defaults:
 * - agentsMayConnectPersonalGoogle: false — Admin owns Google Connect. Agents
 *   only start personal Gmail / Calendar / Meet OAuth when this is on.
 * - agentsMayUseMacros: false — macros stay Advanced / Admin unless enabled.
 * - agentsMaySeeTeamScope: falls back to showCompanyWidgets (do not break
 *   existing home Team / agency-book widgets). Per-agent canSeeAgencyWidgets
 *   still controls book visibility.
 * - agentsMayAdvertiseGoogleBusiness: false — prefs-only until GBP advertise.
 * - agentsMayDeletePolicyDocuments: true — admin can forbid agent deletes after policy create.
 */

export const AGENT_FEATURE_TOGGLE_IDS = [
  "agentsMayConnectPersonalGoogle",
  "agentsMayUseMacros",
  "agentsMaySeeTeamScope",
  "agentsMayAdvertiseGoogleBusiness",
  "agentsMayDeletePolicyDocuments",
] as const;

export type AgentFeatureToggleId = (typeof AGENT_FEATURE_TOGGLE_IDS)[number];

export type AgentFeatureToggles = Record<AgentFeatureToggleId, boolean>;

export const DEFAULT_AGENT_FEATURE_TOGGLES: AgentFeatureToggles = {
  agentsMayConnectPersonalGoogle: false,
  agentsMayUseMacros: false,
  agentsMaySeeTeamScope: false,
  agentsMayAdvertiseGoogleBusiness: false,
  agentsMayDeletePolicyDocuments: true,
};

export const AGENT_FEATURE_TOGGLE_COPY: Record<
  AgentFeatureToggleId,
  { title: string; hint: string }
> = {
  agentsMayConnectPersonalGoogle: {
    title: "Agents may connect personal Google",
    hint: "When on, an agent can start Gmail / Calendar / Meet OAuth with the agency app. Default off — Admin connects the agency inbox.",
  },
  agentsMayUseMacros: {
    title: "Agents may use macros",
    hint: "When off, Macros stay under Advanced / Admin and are hidden from the agent Settings rail. Default off.",
  },
  agentsMaySeeTeamScope: {
    title: "Agents may see Team / agency book widgets",
    hint: "Agency master for Home company widgets (same column as showCompanyWidgets). Per-agent canSeeAgencyWidgets still gates the client book.",
  },
  agentsMayAdvertiseGoogleBusiness: {
    title: "Agents may advertise Google Business",
    hint: "Prefs-only until GBP advertise ships. Default off. Monitor GBP still has its own Social toggle.",
  },
  agentsMayDeletePolicyDocuments: {
    title: "Agents may delete policy documents",
    hint: "When off, agents cannot trash documents once a policy exists. Admins can still delete. Default on.",
  },
};

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function normalizeAgentFeatureToggles(raw: unknown): AgentFeatureToggles {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const next = { ...DEFAULT_AGENT_FEATURE_TOGGLES };
  for (const id of AGENT_FEATURE_TOGGLE_IDS) {
    if (id in source) next[id] = asBool(source[id]);
  }
  return next;
}

export function patchAgentFeatureToggle(
  current: AgentFeatureToggles,
  id: AgentFeatureToggleId,
  enabled: boolean,
): AgentFeatureToggles {
  return { ...current, [id]: enabled };
}
