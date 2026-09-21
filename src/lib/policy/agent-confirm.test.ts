import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAgentConfirmAudit, formatEasternConfirmStamp, parseAgentConfirm } from "./agent-confirm";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("policy looks good audit", () => {
  it("stamps agent id, name, and Eastern time", () => {
    const at = new Date("2026-09-21T23:34:00.000Z");
    const stamp = formatEasternConfirmStamp(at);
    expect(stamp).toMatch(/Sep 21, 2026/);
    expect(stamp).toMatch(/7:34/);
    expect(stamp).toMatch(/EDT/);
    const audit = buildAgentConfirmAudit({
      userId: "user-javy",
      name: "Javy",
      at,
    });
    expect(audit).toEqual({
      userId: "user-javy",
      name: "Javy",
      confirmedAt: "2026-09-21T23:34:00.000Z",
      confirmedAtEt: stamp,
    });
    expect(parseAgentConfirm(audit)?.name).toBe("Javy");
    expect(parseAgentConfirm({ name: "", confirmedAt: audit.confirmedAt })).toBeNull();
  });

  it("records the confirm on publish and shows Policy looks good", () => {
    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/buildAgentConfirmAudit/);
    expect(mint).toMatch(/fieldKey: "agent_confirm"/);
    expect(mint).toMatch(/Policy looks good/);
    const queue = source("src/components/policy/mint-confirm-queue.tsx");
    expect(queue).toMatch(/Policy looks good/);
    expect(queue).not.toMatch(/const published = await publishMintedPolicy\(publish\)/);
    const page = source("src/app/policies/[id]/page.tsx");
    expect(page).toMatch(/data-ff-policy-looks-good-audit/);
    expect(page).toMatch(/PolicyDetailWorkspace/);
  });
});
