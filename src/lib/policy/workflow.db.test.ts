import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { CONTACT_ID, DEMO_CONTACT_ID, DEMO_POLICY_ID, DEMO_PRIOR_POLICY_NUMBER } from "@/lib/fixtures/ids";
import { sql } from "@/lib/db";
import { policies, policyAttachments, policyEvents } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { getContact360, matchReplacementNotice } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { filePolicyChange } from "./service";

describe("seeded book + policy workflow", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it("leaves Ana unbound and boots a demo Active Policy", async () => {
    const ana = await db.select().from(policies).where(eq(policies.contactId, CONTACT_ID));
    expect(ana).toHaveLength(0);

    const [demo] = await db.select().from(policies).where(eq(policies.id, DEMO_POLICY_ID));
    expect(demo?.status).toBe("active");
    expect(demo?.policyNumber).toBe("AIC-HO3-44118");
    expect(demo?.coverageA).toBe(385000);

    const ruiz = await getContact360(DEMO_CONTACT_ID);
    expect(ruiz?.counts).toEqual({ active: 1, lifetime: 2 });
  });

  it("matches a replacement by premises and ignores a cancelled number", async () => {
    const byHouse = await matchReplacementNotice({
      address1: "412 Oak Grove Ln",
      city: "Winter Garden",
      state: "FL",
      zip: "34787",
      policyNumber: DEMO_PRIOR_POLICY_NUMBER,
    });
    expect(byHouse.ignoredCancelledNumber).toBe(DEMO_PRIOR_POLICY_NUMBER);
    expect(byHouse.matches.map((row) => row.policy.policyNumber)).toEqual(["AIC-HO3-44118"]);
  });

  it("endorses then cancels the same Policy with a durable log and 360 update", async () => {
    const endorsed = await filePolicyChange({
      policyId: DEMO_POLICY_ID,
      kind: "endorsement",
      effectiveDate: "2026-06-15",
      reason: "coverage_change",
      summary: "Raise Coverage A after rebuild review",
      coverageA: "410000",
      premium: "3012.00",
      attachDeskCopy: true,
    });
    expect(endorsed.ok).toBe(true);

    const cancelled = await filePolicyChange({
      policyId: DEMO_POLICY_ID,
      kind: "cancellation",
      effectiveDate: "2026-09-01",
      reason: "insured_request",
      summary: "Insured requested flat cancel after the endorsement.",
      attachDeskCopy: true,
    });
    expect(cancelled.ok).toBe(true);

    const [row] = await db.select().from(policies).where(eq(policies.id, DEMO_POLICY_ID));
    expect(row?.id).toBe(DEMO_POLICY_ID);
    expect(row?.status).toBe("cancellation");
    expect(row?.coverageA).toBe(410000);
    expect(row?.endReason).toBe("insured_request");

    const events = await db
      .select()
      .from(policyEvents)
      .where(eq(policyEvents.policyId, DEMO_POLICY_ID));
    expect(events.map((event) => event.kind).sort()).toEqual(["cancellation", "endorsement"]);

    const docs = await db
      .select()
      .from(policyAttachments)
      .where(eq(policyAttachments.policyId, DEMO_POLICY_ID));
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const ruiz = await getContact360(DEMO_CONTACT_ID);
    expect(ruiz?.counts).toEqual({ active: 0, lifetime: 2 });
  });
});
