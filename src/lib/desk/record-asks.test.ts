import { describe, expect, it } from "vitest";
import { parseRecordAsk } from "./record-asks";
import { recordHref } from "./record-href";
import { AGENT_USER_ID, ELENA_POLICY_ID } from "@/lib/fixtures/ids";

describe("parseRecordAsk", () => {
  it("rejects a typed name with no dropdown tag", () => {
    const res = parseRecordAsk({
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      assigneeId: "",
      body: "Maya what's the status?",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/dropdown/i);
  });

  it("accepts a carrier ask", () => {
    const res = parseRecordAsk({
      entityType: "carrier",
      entityId: ELENA_POLICY_ID,
      assigneeId: AGENT_USER_ID,
      body: "Confirm AIC UW phone before we shop.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.entityType).toBe("carrier");
  });

  it("accepts a tagged teammate + ask text", () => {
    const res = parseRecordAsk({
      entityType: "policy",
      entityId: ELENA_POLICY_ID,
      assigneeId: AGENT_USER_ID,
      body: "What's the status on HO3-ELENA-2026?",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.assigneeId).toBe(AGENT_USER_ID);
  });
});

describe("recordHref", () => {
  it("routes policy asks to the policy page", () => {
    expect(recordHref("policy", ELENA_POLICY_ID)).toBe(`/policies/${ELENA_POLICY_ID}`);
    expect(recordHref("carrier", ELENA_POLICY_ID)).toBe(`/carriers/${ELENA_POLICY_ID}`);
  });
});
