import { describe, expect, it } from "vitest";
import { addUtcDays } from "@/lib/home/as-of";
import { planPolicyDateAutomationJobs } from "./date-automations";

const AS_OF = new Date("2026-09-01T12:00:00.000Z");

function plan(overrides: Partial<Parameters<typeof planPolicyDateAutomationJobs>[0]> = {}) {
  return planPolicyDateAutomationJobs({
    status: "active",
    expirationDate: addUtcDays(AS_OF, 20),
    oepStart: null,
    lineOfBusiness: "HO3",
    commissionFamily: "pc",
    policySubType: null,
    asOf: AS_OF,
    party: "Soto, Ivy",
    policyType: "HO3",
    policyNumber: "HO-100",
    ...overrides,
  });
}

describe("planPolicyDateAutomationJobs", () => {
  it("schedules renewal_30 and renewal_60 when the X-date is inside 30 days", () => {
    const jobs = plan();
    expect(jobs.map((job) => job.kind)).toEqual(["renewal_30", "renewal_60"]);
    expect(jobs[0]?.title).toBe("Policy renewal coming up - Soto, Ivy - HO3");
    expect(jobs[0]?.body).toContain("30-day renewal");
    expect(jobs[0]?.body).toContain("90-day is off");
  });

  it("schedules only renewal_60 between 31 and 60 days", () => {
    const jobs = plan({ expirationDate: addUtcDays(AS_OF, 45) });
    expect(jobs.map((job) => job.kind)).toEqual(["renewal_60"]);
  });

  it("schedules nothing when the X-date is outside 60 days", () => {
    expect(plan({ expirationDate: addUtcDays(AS_OF, 90) })).toEqual([]);
  });

  it("schedules no renewal or OEP work when status is off-book, even with a future X-date", () => {
    const xDate = addUtcDays(AS_OF, 12);
    const oepStart = addUtcDays(AS_OF, 40);
    for (const status of ["lapsed", "cancelled", "non_renewed", "expired", "lapse", "non_renewal"]) {
      expect(
        plan({
          status,
          expirationDate: xDate,
          oepStart,
          lineOfBusiness: "HEALTH",
          commissionFamily: "health_marketplace",
          policySubType: "marketplace",
        }),
        status,
      ).toEqual([]);
    }
  });

  it("still schedules OEP stay-put for an in-force marketplace line", () => {
    const oepStart = addUtcDays(AS_OF, 40);
    const jobs = plan({
      status: "active",
      expirationDate: addUtcDays(AS_OF, 200),
      oepStart,
      lineOfBusiness: "HEALTH",
      commissionFamily: "health_marketplace",
      policySubType: "marketplace",
    });
    expect(jobs.map((job) => job.kind)).toEqual(["oep_stay_put"]);
    expect(jobs[0]?.body).toContain("No client email");
  });
});
