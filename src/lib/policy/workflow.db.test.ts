import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { CONTACT_ID, DEMO_CONTACT_ID, DEMO_POLICY_ID, DEMO_POLICY_NUMBER, TENANT_ID } from "@/lib/fixtures/ids";
import { sql } from "@/lib/db";
import { clientHistory, policies, policyAttachments, policyEvents } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { db } from "@/lib/db";
import { filePolicyChange } from "./service";
import { matchReplacementNotice } from "@/lib/db/queries";

const TEMP_POLICY_ID = "a9a9a9a9-a9a9-49a9-89a9-a9a9a9a9a901";

describe("seeded book + policy workflow", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await db.delete(policyAttachments).where(eq(policyAttachments.policyId, TEMP_POLICY_ID));
    await db.delete(policyEvents).where(eq(policyEvents.policyId, TEMP_POLICY_ID));
    await db.delete(clientHistory).where(eq(clientHistory.policyId, TEMP_POLICY_ID));
    await db.delete(policies).where(eq(policies.id, TEMP_POLICY_ID));
    await sql.end({ timeout: 5 });
  });

  it("leaves Ana unbound and keeps Elena’s Melbourne HO3 Active", async () => {
    const ana = await db.select().from(policies).where(eq(policies.contactId, CONTACT_ID));
    expect(ana).toHaveLength(0);

    const [elena] = await db.select().from(policies).where(eq(policies.id, DEMO_POLICY_ID));
    expect(elena?.status).toBe("active");
    expect(elena?.policyNumber).toBe(DEMO_POLICY_NUMBER);
    expect(elena?.coverageA).toBe(385000);

    const elenaBook = await db.select().from(policies).where(eq(policies.contactId, DEMO_CONTACT_ID));
    expect(elenaBook.some((row) => row.status === "active")).toBe(true);
    expect(elenaBook.length).toBeGreaterThanOrEqual(1);
  });

  it("matches a replacement by Elena’s premises", async () => {
    const byHouse = await matchReplacementNotice({
      address1: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      policyNumber: "AIC-HO3-22001",
    });
    expect(byHouse.matches.map((row) => row.policy.policyNumber)).toContain(DEMO_POLICY_NUMBER);
  });

  it("endorses then cancels a throwaway policy with a durable log", async () => {
    await db.delete(clientHistory).where(eq(clientHistory.policyId, TEMP_POLICY_ID));
    await db.delete(policyAttachments).where(eq(policyAttachments.policyId, TEMP_POLICY_ID));
    await db.delete(policyEvents).where(eq(policyEvents.policyId, TEMP_POLICY_ID));
    await db.delete(policies).where(eq(policies.id, TEMP_POLICY_ID));
    await db.insert(policies).values({
      id: TEMP_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: DEMO_CONTACT_ID,
      policyNumber: "HO3-TEMP-WORKFLOW",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2026-09-01T05:00:00.000Z"),
      expirationDate: new Date("2027-09-01T05:00:00.000Z"),
      premium: "2840.00",
      coverageA: 385000,
      premisesAddress: "99 Test Lane",
      premisesCity: "Melbourne",
      premisesState: "FL",
      premisesZip: "32935",
    });

    const endorsed = await filePolicyChange({
      policyId: TEMP_POLICY_ID,
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
      policyId: TEMP_POLICY_ID,
      kind: "cancellation",
      effectiveDate: "2026-09-01",
      reason: "insured_request",
      summary: "Insured requested flat cancel after the endorsement.",
      attachDeskCopy: true,
    });
    expect(cancelled.ok).toBe(true);

    const [row] = await db.select().from(policies).where(eq(policies.id, TEMP_POLICY_ID));
    expect(row?.status).toBe("cancellation");
    expect(row?.coverageA).toBe(410000);
    expect(row?.endReason).toBe("insured_request");

    const events = await db.select().from(policyEvents).where(eq(policyEvents.policyId, TEMP_POLICY_ID));
    expect(events.map((event) => event.kind).sort()).toEqual(["cancellation", "endorsement"]);

    const docs = await db
      .select()
      .from(policyAttachments)
      .where(eq(policyAttachments.policyId, TEMP_POLICY_ID));
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const [elena] = await db.select().from(policies).where(eq(policies.id, DEMO_POLICY_ID));
    expect(elena?.status).toBe("active");
    expect(elena?.policyNumber).toBe(DEMO_POLICY_NUMBER);
  });
});
