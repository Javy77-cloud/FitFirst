import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  CONTACT_ID as ANA_CONTACT_ID,
  ELENA_POLICY_ID,
  HARBOR_POLICY_ID,
  TENANT_ID,
} from "@/lib/fixtures/ids";
import { sql } from "@/lib/db";
import { policies, policyAttachments, policyEvents } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { db } from "@/lib/db";
import { filePolicyChange } from "./service";

describe("seeded book + policy workflow", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it("leaves Ana unbound and keeps Elena bound", async () => {
    const ana = await db.select().from(policies).where(eq(policies.contactId, ANA_CONTACT_ID));
    expect(ana).toHaveLength(0);

    const [elena] = await db.select().from(policies).where(eq(policies.id, ELENA_POLICY_ID));
    expect(elena?.status).toBe("active");
    expect(elena?.policyNumber).toBe("HO3-ELENA-2026");
    expect(elena?.coverageA).toBe(385000);

    const [harbor] = await db.select().from(policies).where(eq(policies.id, HARBOR_POLICY_ID));
    expect(harbor?.policyNumber).toBe("GL-HARBOR-2026");
    expect(["active", "bound"]).toContain(harbor?.status);
  });

  it("endorses then cancels a throwaway Policy, never Elena or Harbor", async () => {
    const scratchId = randomUUID();
    await db.insert(policies).values({
      id: scratchId,
      tenantId: TENANT_ID,
      contactId: null,
      policyNumber: "HO3-SCRATCH-AMS",
      lineOfBusiness: "HO",
      status: "active",
      coverageA: 300000,
      premium: "2100.00",
      effectiveDate: new Date("2026-01-01T12:00:00.000Z"),
      expirationDate: new Date("2027-01-01T12:00:00.000Z"),
    });

    const endorsed = await filePolicyChange({
      policyId: scratchId,
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
      policyId: scratchId,
      kind: "cancellation",
      effectiveDate: "2026-09-01",
      reason: "insured_request",
      summary: "Insured requested flat cancel after the endorsement.",
      attachDeskCopy: true,
    });
    expect(cancelled.ok).toBe(true);

    const [row] = await db.select().from(policies).where(eq(policies.id, scratchId));
    expect(row?.status).toBe("cancellation");
    expect(row?.coverageA).toBe(410000);
    expect(row?.endReason).toBe("insured_request");

    const events = await db.select().from(policyEvents).where(eq(policyEvents.policyId, scratchId));
    expect(events.map((event) => event.kind).sort()).toEqual(["cancellation", "endorsement"]);

    const docs = await db
      .select()
      .from(policyAttachments)
      .where(eq(policyAttachments.policyId, scratchId));
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const [elena] = await db.select().from(policies).where(eq(policies.id, ELENA_POLICY_ID));
    expect(elena?.status).toBe("active");
    expect(elena?.policyNumber).toBe("HO3-ELENA-2026");
  });
});
