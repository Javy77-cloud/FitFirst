import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID, ELENA_POLICY_ID, HALE_POLICY_ID } from "@/lib/fixtures/ids";
import { demoTargetForPlaybook } from "./demo-targets";

describe("demoTargetForPlaybook", () => {
  it("keeps the Ana Quote Sent fire on the shopping deal", () => {
    const target = demoTargetForPlaybook({
      triggerKind: "deal_stage_change",
      triggerValue: "quote_sent",
      visibility: "agent",
    });
    expect(target.related.dealId).toBe(DEAL_ID);
    expect(target.related.contactId).toBe(CONTACT_ID);
    expect(target.related.policyId).toBeUndefined();
    expect(target.summary).toContain("$321,000");
    expect(target.summary).toMatch(/do not bind/i);
  });

  it("routes 60-day renewal to Elena and 30-day to Hale compare", () => {
    const sixty = demoTargetForPlaybook({
      triggerKind: "policy_renewal_window",
      triggerValue: "60",
      visibility: "agent",
    });
    const thirty = demoTargetForPlaybook({
      triggerKind: "policy_renewal_window",
      triggerValue: "30",
      visibility: "admin",
    });
    expect(sixty.related.policyId).toBe(ELENA_POLICY_ID);
    expect(thirty.related.policyId).toBe(HALE_POLICY_ID);
  });
});
