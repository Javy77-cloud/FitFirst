import { describe, expect, it } from "vitest";
import { ADMIN_USER_ID, AGENT_USER_ID, CONTACT_ID, DEMO_POLICY_ID } from "@/lib/fixtures/ids";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { pingIsAddressed, pingTargets } from "./ping";

describe("work ping targeting", () => {
  it("addresses the assignee so the in-app bell is not agency-wide", () => {
    expect(pingTargets({ assigneeId: AGENT_USER_ID, actorId: ADMIN_USER_ID })).toEqual({
      userId: AGENT_USER_ID,
      recipientUserId: AGENT_USER_ID,
    });
    expect(pingTargets({ assigneeId: null, actorId: ADMIN_USER_ID })).toEqual({
      userId: ADMIN_USER_ID,
      recipientUserId: ADMIN_USER_ID,
    });
    expect(pingIsAddressed({ userId: AGENT_USER_ID, recipientUserId: AGENT_USER_ID })).toBe(true);
    expect(pingIsAddressed({ userId: null, recipientUserId: null })).toBe(false);
  });

  it("does not attach work pings to Ana", () => {
    expect(DEMO_POLICY_ID).not.toBe(CONTACT_ID);
    expect(fixture.risk.coverageA).toBe(321000);
  });
});
