import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENT_FEATURE_TOGGLES,
  normalizeAgentFeatureToggles,
  patchAgentFeatureToggle,
} from "./agent-feature-toggles";

describe("agent feature toggles", () => {
  it("defaults Google connect, macros, and GBP advertise off", () => {
    expect(DEFAULT_AGENT_FEATURE_TOGGLES).toEqual({
      agentsMayConnectPersonalGoogle: false,
      agentsMayUseMacros: false,
      agentsMaySeeTeamScope: false,
      agentsMayAdvertiseGoogleBusiness: false,
    });
    expect(normalizeAgentFeatureToggles(null)).toEqual(DEFAULT_AGENT_FEATURE_TOGGLES);
  });

  it("keeps unknown keys out and patches one flag", () => {
    const next = normalizeAgentFeatureToggles({
      agentsMayUseMacros: true,
      extra: true,
    });
    expect(next.agentsMayUseMacros).toBe(true);
    expect(next.agentsMayConnectPersonalGoogle).toBe(false);
    expect(patchAgentFeatureToggle(next, "agentsMayConnectPersonalGoogle", true).agentsMayConnectPersonalGoogle).toBe(
      true,
    );
  });
});
