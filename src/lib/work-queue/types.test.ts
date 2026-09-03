import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  CONTACT_ID,
  DEMO_POLICY_ID,
  DEMO_WORK_ITEM_ID,
} from "@/lib/fixtures/ids";
import {
  WORK_FLAGS,
  WORK_REMINDER_KIND,
  isWorkFlag,
  isWorkStatus,
  workFlagLabel,
  workStatusLabel,
} from "./types";

describe("work queue domain", () => {
  it("keeps work status separate from policy status", () => {
    expect(isWorkStatus("waiting_on_docs")).toBe(true);
    expect(isWorkStatus("active")).toBe(false);
    expect(workStatusLabel("waiting_on_docs")).toBe("Waiting on docs");
    expect(workStatusLabel("endorsement_pending")).toBe("Endorsement pending");
  });

  it("labels the demo carrier-needs-docs flag", () => {
    expect(isWorkFlag("carrier_requested_info")).toBe(true);
    expect(workFlagLabel("carrier_requested_info")).toBe("Carrier needs docs");
    expect(WORK_FLAGS).toContain("need_more_docs");
    expect(WORK_FLAGS).toContain("endorsement_required");
    expect(WORK_FLAGS).toContain("lapse_warning");
  });

  it("uses an in-app Task kind, never email", () => {
    expect(WORK_REMINDER_KIND).toBe("work_reminder");
    expect(WORK_REMINDER_KIND).not.toMatch(/email/i);
  });

  it("does not attach the work-queue demo to Ana", () => {
    expect(CONTACT_ID).toBe("22222222-2222-4222-8222-222222222224");
    expect(DEMO_WORK_ITEM_ID).not.toBe(CONTACT_ID);
    expect(DEMO_POLICY_ID).not.toBe(CONTACT_ID);
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
  });

  it("assigns solo seed work to the shared admin user", () => {
    expect(ADMIN_USER_ID).toBe("44444444-4444-4444-8444-444444444401");
    expect(AGENT_USER_ID).toBe("44444444-4444-4444-8444-444444444402");
  });
});
