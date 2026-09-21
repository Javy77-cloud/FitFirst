import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Agent desk entry after Settings IA (#170)", () => {
  it("does not bare-select agency_settings on Home (avoids missing agent_feature_toggles white screen)", () => {
    const queries = source("src/lib/db/queries.ts");
    // ownerHomeDashboard must only ask for showCompanyWidgets — a full select()
    // expands to agent_feature_toggles and 500s Home when migrate 0146 has not run.
    expect(queries).toMatch(
      /showCompanyWidgets:\s*agencySettings\.showCompanyWidgets[\s\S]*?\.from\(agencySettings\)/,
    );
    expect(queries).not.toMatch(
      /db\s*\n\s*\.select\(\)\s*\n\s*\.from\(agencySettings\)\s*\n\s*\.where\(eq\(agencySettings\.tenantId,\s*scope\.tenantId\)\)/,
    );
    // getAgencySettings stays column-safe (no agentFeatureToggles in the select list).
    const getAgency = queries.slice(queries.indexOf("export async function getAgencySettings"));
    const block = getAgency.slice(0, getAgency.indexOf("export async function listLeads"));
    expect(block).toMatch(/agencyName:\s*agencySettings\.agencyName/);
    expect(block).not.toMatch(/agentFeatureToggles/);
  });

  it("keeps getAgentFeatureToggles fail-closed for macros gate", () => {
    const prefs = source("src/lib/settings/agent-feature-toggles-prefs.ts");
    expect(prefs).toMatch(/export async function getAgentFeatureToggles/);
    expect(prefs).toMatch(/catch\s*\{[\s\S]*DEFAULT_AGENT_FEATURE_TOGGLES/);
    expect(prefs).toMatch(/sessionMayUseMacros/);
  });

  it("ships apply-0146 for Production when migrate was skipped", () => {
    const script = source("scripts/apply-0146-agent-feature-toggles.ts");
    const pkg = source("package.json");
    expect(script).toMatch(/0146_agent_feature_toggles/);
    expect(script).toMatch(/agent_feature_toggles/);
    expect(pkg).toMatch(/db:apply-0146/);
  });
});
