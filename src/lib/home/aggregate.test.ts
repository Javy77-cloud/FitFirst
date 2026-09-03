import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "./as-of";
import {
  boundWaitingOnIssue,
  buildOwnerHome,
  filterByAssignee,
  inForcePolicies,
  isInForce,
  pipelineCounts,
  writtenInMonth,
} from "./aggregate";
import type { HomeDeal, HomePolicy, HomeTask } from "./aggregate";

const asOf = DESK_AS_OF;

function policy(partial: Partial<HomePolicy> & Pick<HomePolicy, "id" | "status" | "premium">): HomePolicy {
  return {
    contactId: "c1",
    carrierId: "car1",
    carrierName: "American Integrity",
    contactName: "Ruiz, Camila",
    policyNumber: "P-1",
    lineOfBusiness: "HO",
    effectiveDate: new Date("2026-02-01T00:00:00.000Z"),
    expirationDate: new Date("2027-02-01T00:00:00.000Z"),
    ...partial,
  };
}

function deal(partial: Partial<HomeDeal> & Pick<HomeDeal, "id" | "pipelineStage">): HomeDeal {
  return {
    title: "Shop",
    lineOfBusiness: "HO",
    boundAt: null,
    updatedAt: asOf,
    contactId: null,
    ...partial,
  };
}

describe("owner-home book math", () => {
  it("counts Active/Bound only — quotes are not coverage", () => {
    const rows = [
      policy({ id: "1", status: "active", premium: 3340 }),
      policy({ id: "2", status: "bound", premium: 8640, lineOfBusiness: "GL" }),
      policy({ id: "3", status: "quoted", premium: 321000 }),
      policy({ id: "4", status: "shopping", premium: 321000 }),
      policy({ id: "5", status: "lapsed", premium: 2190 }),
    ];
    expect(inForcePolicies(rows)).toHaveLength(2);
    expect(isInForce({ status: "quoted" })).toBe(false);
  });

  it("does not treat Ana's unbound $321k shop as in-force premium", () => {
    const anaShop: HomeDeal = deal({
      id: "ana",
      title: "Dib · Palm Bay HO3",
      pipelineStage: "shopping",
      contactId: "ana-contact",
    });
    const snapshot = buildOwnerHome({
      asOf,
      policies: [],
      deals: [anaShop],
      tasks: [],
    });
    expect(snapshot.inForceCount).toBe(0);
    expect(snapshot.inForcePremium).toBe(0);
    expect(snapshot.pipeline.openQuotes).toBe(1);
    expect(snapshot.pipeline.closedWonThisMonth).toBe(0);
    expect(snapshot.lineMix.find((s) => s.key === "HO")?.premium).toBe(0);
  });

  it("compares written premium this month vs last from effective dates", () => {
    const rows = [
      policy({
        id: "sep",
        status: "active",
        premium: 8640,
        lineOfBusiness: "GL",
        effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
      }),
      policy({
        id: "aug",
        status: "active",
        premium: 712,
        lineOfBusiness: "FLOOD",
        effectiveDate: new Date("2026-08-10T00:00:00.000Z"),
      }),
      policy({
        id: "old",
        status: "active",
        premium: 3340,
        effectiveDate: new Date("2026-02-15T00:00:00.000Z"),
      }),
    ];
    expect(writtenInMonth(rows, asOf).map((p) => p.id)).toEqual(["sep"]);
    const snap = buildOwnerHome({ asOf, policies: rows, deals: [], tasks: [] });
    expect(snap.written.thisMonth).toEqual({ count: 1, premium: 8640 });
    expect(snap.written.lastMonth).toEqual({ count: 1, premium: 712 });
  });

  it("buckets renewals at 30 and 60 days", () => {
    const rows = [
      policy({
        id: "30",
        status: "active",
        premium: 1488,
        expirationDate: new Date("2026-09-28T00:00:00.000Z"),
      }),
      policy({
        id: "60",
        status: "active",
        premium: 3015,
        expirationDate: new Date("2026-11-02T00:00:00.000Z"),
      }),
      policy({
        id: "later",
        status: "active",
        premium: 1910,
        expirationDate: new Date("2027-01-01T00:00:00.000Z"),
      }),
    ];
    const snap = buildOwnerHome({ asOf, policies: rows, deals: [], tasks: [] });
    expect(snap.renewals30).toEqual({ days: 30, count: 1, premium: 1488 });
    expect(snap.renewals60).toEqual({ days: 60, count: 2, premium: 4503 });
  });

  it("fills Home / Auto / Flood / Commercial / Health / Life mix from real lines", () => {
    const rows = [
      policy({ id: "ho", status: "active", premium: 3340, lineOfBusiness: "HO" }),
      policy({ id: "au", status: "active", premium: 1910, lineOfBusiness: "AUTO" }),
      policy({ id: "fl", status: "active", premium: 712, lineOfBusiness: "FLOOD" }),
      policy({ id: "gl", status: "bound", premium: 8640, lineOfBusiness: "GL" }),
    ];
    const mix = buildOwnerHome({ asOf, policies: rows, deals: [], tasks: [] }).lineMix;
    expect(mix.map((s) => [s.label, s.premium])).toEqual([
      ["Home", 3340],
      ["Auto", 1910],
      ["Flood", 712],
      ["Commercial", 8640],
      ["Health", 0],
      ["Life", 0],
    ]);
  });

  it("counts pipeline stages and bound-waiting-on-issue", () => {
    const deals = [
      deal({ id: "ana", pipelineStage: "shopping", title: "Dib · Palm Bay HO3" }),
      deal({ id: "qs", pipelineStage: "quote_sent", title: "Nguyen · Auto" }),
      deal({
        id: "won",
        pipelineStage: "bound",
        title: "Harbor Key · GL",
        contactId: "hk",
        boundAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
      deal({
        id: "pending",
        pipelineStage: "bound",
        title: "Reyes · HO3",
        contactId: "reyes",
        boundAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    ];
    const policies = [
      policy({
        id: "hk-gl",
        status: "bound",
        premium: 8640,
        contactId: "hk",
        dealId: "won",
        lineOfBusiness: "GL",
      }),
    ];
    expect(pipelineCounts(deals, asOf)).toEqual({
      openQuotes: 1,
      quoteSent: 1,
      closedWonThisMonth: 2,
    });
    expect(boundWaitingOnIssue(deals, policies).map((d) => d.id)).toEqual(["pending"]);

    const commercialOnly = [
      deal({ id: "marine", pipelineStage: "bound", title: "Harbor Key Marine · GL", contactId: null }),
    ];
    const onAccount = [
      policy({
        id: "gl-harbor",
        status: "active",
        premium: 4180,
        contactId: "",
        dealId: "marine",
        lineOfBusiness: "GL",
      }),
    ];
    expect(boundWaitingOnIssue(commercialOnly, onAccount)).toEqual([]);
  });

  it("counts household cross-sell gaps from in-force lines, not a score", () => {
    const rows = [
      policy({ id: "r-ho", status: "active", premium: 3340, contactId: "ruiz", contactName: "Ruiz, Camila" }),
      policy({
        id: "r-au",
        status: "active",
        premium: 1910,
        contactId: "ruiz",
        contactName: "Ruiz, Camila",
        lineOfBusiness: "AUTO",
      }),
      policy({
        id: "p-fl",
        status: "active",
        premium: 712,
        contactId: "patel",
        contactName: "Patel, Nia",
        lineOfBusiness: "FLOOD",
      }),
    ];
    const snap = buildOwnerHome({ asOf, policies: rows, deals: [], tasks: [] });
    expect(snap.gapCount).toBe(2);
    expect(snap.gaps.find((g) => g.contactId === "ruiz")?.missing).toEqual(["Flood"]);
    expect(snap.gaps.find((g) => g.contactId === "patel")?.missing).toEqual(["Home", "Auto"]);
  });

  it("scopes an agent to assignee rows when that column exists", () => {
    const rows = [
      policy({ id: "mine", status: "active", premium: 1000, ownerId: "agent-1" }),
      policy({ id: "theirs", status: "active", premium: 9000, ownerId: "agent-2" }),
    ];
    const mine = filterByAssignee(rows, "agent-1", true);
    expect(mine.map((p) => p.id)).toEqual(["mine"]);
    expect(filterByAssignee(rows, "agent-1", false)).toHaveLength(2);
  });

  it("surfaces work-queue tasks, lapses, and bound-pending in attention", () => {
    const tasks: HomeTask[] = [
      {
        id: "t1",
        title: "Issue packet · Reyes",
        dueDate: new Date("2026-09-05T00:00:00.000Z"),
        kind: "issue",
        dealId: "pending",
        policyId: null,
        contactId: "reyes",
      },
    ];
    const snap = buildOwnerHome({
      asOf,
      policies: [policy({ id: "lapse", status: "lapsed", premium: 2190, contactName: "Soto, Ivy" })],
      deals: [deal({ id: "pending", pipelineStage: "bound", title: "Reyes · HO3", contactId: "reyes" })],
      tasks,
    });
    expect(snap.attention.map((a) => a.kind)).toEqual(["task", "lapse", "bound_pending"]);
  });
});
