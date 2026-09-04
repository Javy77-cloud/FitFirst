import { describe, expect, it } from "vitest";
import { AGENT_USER_ID, ADMIN_USER_ID } from "@/lib/fixtures/ids";
import {
  agentReconBucket,
  deriveReconStatus,
  filterAgentOwnRows,
  filterReconStatus,
  parseReceivedAmount,
  producerTotals,
  reconBoardTotals,
  reconVariance,
  type ReconWorkspaceRow,
} from "./reconcile";

const mayaShort: ReconWorkspaceRow = {
  reconId: "r-shah",
  commissionId: "c-shah",
  agentId: AGENT_USER_ID,
  agentName: "Maya Chen",
  policyNumber: "HO-SHAH-2026",
  lineOfBusiness: "HO",
  expected: 215.6,
  received: 180,
  variance: 35.6,
  status: "short",
  note: "Statement light",
  paid: false,
};

const mayaDisputed: ReconWorkspaceRow = {
  reconId: "r-ruiz",
  commissionId: "c-ruiz",
  agentId: AGENT_USER_ID,
  agentName: "Maya Chen",
  policyNumber: "HO3-ELENA-EARNINGS",
  lineOfBusiness: "HO",
  expected: 240.48,
  received: 0,
  variance: 240.48,
  status: "disputed",
  note: "Missing statement — not Ana",
  paid: false,
};

const mayaEarned: ReconWorkspaceRow = {
  reconId: "r-reed",
  commissionId: "c-reed",
  agentId: AGENT_USER_ID,
  agentName: "Maya Chen",
  policyNumber: "PA-REED-2026",
  lineOfBusiness: "AUTO",
  expected: 142,
  received: 142,
  variance: 0,
  status: "earned",
  note: null,
  paid: true,
};

const javyShort: ReconWorkspaceRow = {
  reconId: "r-hale",
  commissionId: "c-hale",
  agentId: ADMIN_USER_ID,
  agentName: "Javy Rivera",
  policyNumber: "HO-HALE-2026",
  lineOfBusiness: "HO",
  expected: 262.08,
  received: 198,
  variance: 64.08,
  status: "short",
  note: "People's Trust short",
  paid: false,
};

const book = [mayaShort, mayaDisputed, mayaEarned, javyShort];

describe("manual recon rules", () => {
  it("computes expected minus received", () => {
    expect(reconVariance(215.6, 180)).toBeCloseTo(35.6);
    expect(reconVariance(142, 142)).toBe(0);
  });

  it("derives pending / short / matched / earned from the rule", () => {
    expect(deriveReconStatus({ expected: 215.6, received: 0 })).toBe("pending");
    expect(deriveReconStatus({ expected: 215.6, received: 180 })).toBe("short");
    expect(deriveReconStatus({ expected: 142, received: 142 })).toBe("matched");
    expect(deriveReconStatus({ expected: 142, received: 142, paid: true })).toBe("earned");
    expect(deriveReconStatus({ expected: 240.48, received: 0, explicit: "disputed" })).toBe(
      "disputed",
    );
    expect(deriveReconStatus({ expected: 200, received: 200, explicit: "short" })).toBe("short");
  });

  it("parses a typed remittance", () => {
    expect(parseReceivedAmount("180.00")).toBe(180);
    expect(parseReceivedAmount("$1,198.50")).toBe(1198.5);
    expect(parseReceivedAmount("")).toBe(0);
    expect(parseReceivedAmount("-4")).toBeNull();
  });
});

describe("Admin board vs Agent visibility", () => {
  it("lets Admin keep shortfalls and the whole book", () => {
    const shorts = filterReconStatus(book, "short");
    expect(shorts.map((row) => row.policyNumber)).toEqual(["HO-SHAH-2026", "HO-HALE-2026"]);
    const totals = reconBoardTotals(book);
    expect(totals.shortCount).toBe(2);
    expect(totals.disputedCount).toBe(1);
    expect(totals.shortfall).toBeCloseTo(35.6 + 240.48 + 64.08);
  });

  it("shows Maya only her earned / pending / disputed — not Javy", () => {
    const mine = filterAgentOwnRows(book, AGENT_USER_ID);
    expect(mine.every((row) => row.agentId === AGENT_USER_ID)).toBe(true);
    expect(mine.some((row) => row.agentId === ADMIN_USER_ID)).toBe(false);
    expect(mine.map((row) => agentReconBucket(row.status)).sort()).toEqual([
      "disputed",
      "earned",
      "pending",
    ]);
    const totals = producerTotals(mine);
    expect(totals.earned).toBeCloseTo(142);
    expect(totals.pending).toBeCloseTo(35.6);
    expect(totals.disputed).toBeCloseTo(240.48);
    expect(totals.earnedCount).toBe(1);
    expect(totals.pendingCount).toBe(1);
    expect(totals.disputedCount).toBe(1);
  });

  it("never invents an Ana Dib commission row", () => {
    const blob = book.map((row) => `${row.policyNumber} ${row.note ?? ""}`).join(" ");
    expect(/ana dib/i.test(blob)).toBe(false);
    expect(filterAgentOwnRows(book, "not-a-user")).toEqual([]);
  });
});
