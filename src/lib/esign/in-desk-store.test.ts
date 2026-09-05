import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deals, policies, risks } from "@/lib/db/schema";
import { CONTACT_ID, DEAL_ID, ELENA_DEAL_ID, ELENA_POLICY_ID } from "@/lib/fixtures/ids";
import { performInDeskComplete, performInDeskRequest } from "./in-desk-store";

describe("in-desk e-sign store", () => {
  it("requests and signs Elena's deal, and leaves Ana unbound at $321k", async () => {
    const requested = await performInDeskRequest({
      kind: "deal",
      recordId: ELENA_DEAL_ID,
      createSample: true,
      signerName: "Elena Ruiz",
    });
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;

    const signed = await performInDeskComplete({
      token: requested.token,
      typedName: "Elena Ruiz",
      kind: "typed",
      drawnData: "",
      role: "agent_demo",
    });
    expect(signed.ok).toBe(true);

    const [elena] = await db.select().from(deals).where(eq(deals.id, ELENA_DEAL_ID));
    expect(elena?.esignStatus).toBe("signed");
    expect(elena?.esignSignedAt).toBeInstanceOf(Date);
    expect(elena?.esignSignerName).toBe("Elena Ruiz");
    expect(elena?.pipelineStage).toBe("bound");

    const [anaDeal] = await db.select().from(deals).where(eq(deals.id, DEAL_ID));
    expect(["shopping", "quote_sent"]).toContain(anaDeal?.pipelineStage);
    expect(anaDeal?.pipelineStage).not.toBe("bound");
    expect(anaDeal?.esignStatus === "none" || anaDeal?.esignStatus === "requested" || anaDeal?.esignStatus === "signed").toBe(
      true,
    );
    const [anaRisk] = await db.select().from(risks).where(eq(risks.dealId, DEAL_ID));
    expect(anaRisk?.coverageA).toBe(321000);
    const anaPolicies = await db.select().from(policies).where(eq(policies.contactId, CONTACT_ID));
    expect(anaPolicies).toHaveLength(0);
  }, 30_000);

  it("requests a signature on Elena's policy without creating a new policy", async () => {
    const requested = await performInDeskRequest({
      kind: "policy",
      recordId: ELENA_POLICY_ID,
      createSample: true,
      signerName: "Elena Ruiz",
    });
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    const signed = await performInDeskComplete({
      token: requested.token,
      typedName: "Elena Ruiz",
      kind: "typed",
      drawnData: "",
      role: "client",
    });
    expect(signed.ok).toBe(true);
    const [policy] = await db.select().from(policies).where(eq(policies.id, ELENA_POLICY_ID));
    expect(policy?.esignStatus).toBe("signed");
    expect(policy?.policyNumber).toBe("HO3-ELENA-2026");
  }, 30_000);
});
