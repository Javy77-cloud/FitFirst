import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  CONTACT_ID,
  CONTACT_ID as ANA_CONTACT_ID,
  DEMO_CONTACT_ID,
  DEMO_POLICY_ID,
  DEMO_POLICY_NUMBER,
  ELENA_POLICY_ID,
  HALE_POLICY_ID,
  HARBOR_POLICY_ID,
  TENANT_ID,
} from "@/lib/fixtures/ids";
import {
  claims,
  clientHistory,
  commissions,
  policies,
  policyAttachments,
  policyEvents,
  policyTerms,
  renewalCompareLogs,
} from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { db } from "@/lib/db";
import { commissionBucket } from "@/lib/commissions/buckets";
import { compareSummary, premiumChange } from "@/lib/renewal/compare";
import { filePolicyChange } from "./service";
import { matchReplacementNotice } from "@/lib/db/queries";
import {
  addWorkNote,
  assignWorkItem,
  notifyAssignee,
  setWorkStatus,
  toggleWorkFlag,
} from "@/lib/work-queue/service";
import { listDeskWorkQueue } from "@/lib/work-queue/list";
import { pingIsAddressed } from "@/lib/work-queue/ping";

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
    // Leave the shared postgres.js pool open — other db tests reuse it.
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

    const [harbor] = await db.select().from(policies).where(eq(policies.id, HARBOR_POLICY_ID));
    expect(harbor?.policyNumber).toBe("GL-HARBOR-2026");
    expect(["active", "bound"]).toContain(harbor?.status);
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
    expect(row?.status).toBe("cancelled");
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
    expect(row?.status).toBe("cancelled");
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

  it("assigns, flags, notes, and pings work on a throwaway Policy", async () => {
    const scratchId = randomUUID();
    await db.insert(policies).values({
      id: scratchId,
      tenantId: TENANT_ID,
      contactId: null,
      policyNumber: "HO3-SCRATCH-WORK",
      lineOfBusiness: "HO",
      status: "active",
      coverageA: 250000,
      premium: "1800.00",
      effectiveDate: new Date("2026-01-01T12:00:00.000Z"),
      expirationDate: new Date("2027-01-01T12:00:00.000Z"),
    });

    const assigned = await assignWorkItem(scratchId, AGENT_USER_ID);
    expect(assigned.assigneeId).toBe(AGENT_USER_ID);

    await setWorkStatus(scratchId, "waiting_on_docs");
    const flagged = await toggleWorkFlag({
      policyId: scratchId,
      flag: "need_more_docs",
      actorId: ADMIN_USER_ID,
      on: true,
    });
    expect(flagged.changed).toBe(true);

    const noted = await addWorkNote({
      policyId: scratchId,
      authorId: ADMIN_USER_ID,
      body: "Carrier asked for the wind mit.",
    });
    expect(noted.note.body).toContain("wind mit");

    const ping = await notifyAssignee({
      policyId: scratchId,
      actorId: ADMIN_USER_ID,
      message: "Need the wind mit on scratch file",
      dueDate: new Date("2026-09-08T16:00:00.000Z"),
    });
    expect(pingIsAddressed(ping.alert)).toBe(true);
    expect(ping.alert.userId).toBe(AGENT_USER_ID);
    expect(ping.alert.recipientUserId).toBe(AGENT_USER_ID);

    const queue = await listDeskWorkQueue();
    const row = queue.find((item) => item.policy.id === scratchId);
    expect(row?.flags.some((flag) => flag.flag === "need_more_docs")).toBe(true);
    expect(row?.latestNote).toContain("wind mit");
    expect(row?.openReminders).toBeGreaterThanOrEqual(1);

    const [elena] = await db.select().from(policies).where(eq(policies.id, ELENA_POLICY_ID));
    expect(elena?.status).toBe("active");
  });

  it("logs FNOL on Hale without changing Policy status", async () => {
    const [before] = await db.select().from(policies).where(eq(policies.id, HALE_POLICY_ID));
    expect(before?.status).toBe("active");

    const [claim] = await db
      .insert(claims)
      .values({
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        contactId: before?.contactId ?? null,
        dateReported: new Date("2026-09-05T16:00:00.000Z"),
        dateOfLoss: new Date("2026-09-04T16:00:00.000Z"),
        causeType: "water",
        description: "Supply line under the kitchen sink.",
        reportedHow: "phone",
        status: "inquiry",
        producerId: ADMIN_USER_ID,
      })
      .returning();

    expect(claim.status).toBe("inquiry");

    await db
      .update(claims)
      .set({ status: "referred_to_carrier", updatedAt: new Date() })
      .where(eq(claims.id, claim.id));
    const [moved] = await db.select().from(claims).where(eq(claims.id, claim.id));
    expect(moved?.status).toBe("referred_to_carrier");

    const [after] = await db.select().from(policies).where(eq(policies.id, HALE_POLICY_ID));
    expect(after?.status).toBe("active");
    expect(after?.premium).toBe(before?.premium);

    await db.delete(claims).where(eq(claims.id, claim.id));
  });

  it("marks a commission paid then pending without touching Policy status", async () => {
    const [row] = await db
      .select({ commission: commissions, policy: policies })
      .from(commissions)
      .leftJoin(policies, eq(commissions.policyId, policies.id))
      .where(eq(commissions.tenantId, TENANT_ID));
    expect(row).toBeTruthy();
    const original = row.commission.status;
    const policyStatus = row.policy?.status;

    await db
      .update(commissions)
      .set({ status: "paid", paidDate: new Date(), updatedAt: new Date() })
      .where(eq(commissions.id, row.commission.id));
    const [paid] = await db.select().from(commissions).where(eq(commissions.id, row.commission.id));
    expect(commissionBucket(paid!.status)).toBe("paid");

    await db
      .update(commissions)
      .set({ status: "pending", paidDate: null, updatedAt: new Date() })
      .where(eq(commissions.id, row.commission.id));
    const [pending] = await db.select().from(commissions).where(eq(commissions.id, row.commission.id));
    expect(commissionBucket(pending!.status)).toBe("pending");

    if (row.policy) {
      const [policy] = await db.select().from(policies).where(eq(policies.id, row.policy.id));
      expect(policy?.status).toBe(policyStatus);
    }

    await db
      .update(commissions)
      .set({ status: original, paidDate: row.commission.paidDate, updatedAt: new Date() })
      .where(eq(commissions.id, row.commission.id));
  });

  it("logs a Hale proposed-term compare without changing the in-force premium", async () => {
    const terms = await db.select().from(policyTerms).where(eq(policyTerms.policyId, HALE_POLICY_ID));
    const current = terms.find((term) => term.role === "current");
    const proposed = terms.find((term) => term.role === "proposed");
    expect(current?.premium).toBe("2184.00");
    expect(proposed?.premium).toBe("2547.00");

    const change = premiumChange(Number(current!.premium), Number(proposed!.premium));
    expect(change.delta).toBe(363);
    expect(change.direction).toBe("up");

    const [log] = await db
      .insert(renewalCompareLogs)
      .values({
        tenantId: TENANT_ID,
        policyId: HALE_POLICY_ID,
        currentTermId: current!.id,
        proposedTermId: proposed!.id,
        eventType: "proposed_updated",
        currentPremium: current!.premium!,
        proposedPremium: proposed!.premium!,
        delta: change.delta.toFixed(2),
        pct: change.pct == null ? null : change.pct.toFixed(4),
        summary: compareSummary(change),
        snapshot: { coverageRows: [] },
      })
      .returning();
    expect(log.summary).toMatch(/\$363/);

    const [hale] = await db.select().from(policies).where(eq(policies.id, HALE_POLICY_ID));
    expect(hale?.premium).toBe("2184.00");
    expect(hale?.status).toBe("active");

    await db.delete(renewalCompareLogs).where(eq(renewalCompareLogs.id, log.id));
  });

  it("keeps Elena work flags on the flagged queue and never attaches Ana a Policy", async () => {
    const queue = await listDeskWorkQueue();
    const elena = queue.find((row) => row.policy.id === ELENA_POLICY_ID);
    expect(elena?.flags.length).toBeGreaterThan(0);
    expect(queue.some((row) => row.policy.contactId === ANA_CONTACT_ID)).toBe(false);

    const ana = await db.select().from(policies).where(eq(policies.contactId, ANA_CONTACT_ID));
    expect(ana).toHaveLength(0);
    const [harbor] = await db.select().from(policies).where(eq(policies.id, HARBOR_POLICY_ID));
    expect(harbor?.policyNumber).toBe("GL-HARBOR-2026");
  });
});
