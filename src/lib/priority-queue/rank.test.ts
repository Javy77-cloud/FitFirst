import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  accountLabel,
  comparePriorityQueue,
  isQueueEligibleStatus,
  queuePriority,
  queueTotals,
  rankPriorityQueue,
  renewalAt,
  type PriorityQueueInput,
  type PriorityQueueRow,
} from "./rank";

const asOf = DESK_AS_OF; // 2026-09-03

function row(
  partial: Partial<PriorityQueueInput> & Pick<PriorityQueueInput, "id" | "renewalAt">,
): PriorityQueueInput {
  return {
    policyNumber: partial.policyNumber ?? `POL-${partial.id}`,
    status: partial.status ?? "active",
    premium: partial.premium ?? 1200,
    accountName: partial.accountName ?? "Account",
    href: partial.href ?? `/policies/${partial.id}`,
    ...partial,
  };
}

describe("priority queue ranking", () => {
  it("sorts soonest renewal first, then highest $ at risk", () => {
    const ranked = rankPriorityQueue(
      [
        row({
          id: "late-cheap",
          renewalAt: new Date("2026-11-01T16:00:00.000Z"),
          premium: 900,
          accountName: "Late Cheap",
        }),
        row({
          id: "soon-mid",
          renewalAt: new Date("2026-09-20T16:00:00.000Z"),
          premium: 1800,
          accountName: "Soon Mid",
        }),
        row({
          id: "same-day-high",
          renewalAt: new Date("2026-09-20T16:00:00.000Z"),
          premium: 6400,
          accountName: "Same Day High",
        }),
        row({
          id: "sooner",
          renewalAt: new Date("2026-09-10T16:00:00.000Z"),
          premium: 800,
          accountName: "Sooner",
        }),
      ],
      asOf,
    );

    expect(ranked.map((item) => item.id)).toEqual([
      "sooner",
      "same-day-high",
      "soon-mid",
      "late-cheap",
    ]);
    expect(ranked[1]?.dollarsAtRisk).toBe(6400);
    expect(ranked[2]?.dollarsAtRisk).toBe(1800);
  });

  it("ranks lapse and overdue Highest, then 30/60-day $ bands", () => {
    expect(
      queuePriority({ status: "lapse", daysToRenewal: 12, dollarsAtRisk: 400 }),
    ).toBe("Highest");
    expect(
      queuePriority({ status: "active", daysToRenewal: 0, dollarsAtRisk: 400 }),
    ).toBe("Highest");
    expect(
      queuePriority({ status: "active", daysToRenewal: 21, dollarsAtRisk: 3100 }),
    ).toBe("Highest");
    expect(
      queuePriority({ status: "active", daysToRenewal: 21, dollarsAtRisk: 1800 }),
    ).toBe("High");
    expect(
      queuePriority({ status: "active", daysToRenewal: 45, dollarsAtRisk: 7200 }),
    ).toBe("High");
    expect(
      queuePriority({ status: "bound", daysToRenewal: 45, dollarsAtRisk: 1800 }),
    ).toBe("Normal");
    expect(
      queuePriority({ status: "active", daysToRenewal: 120, dollarsAtRisk: 800 }),
    ).toBe("Low");
  });

  it("drops quotes and cancelled files — they are not renewal $ at risk", () => {
    expect(isQueueEligibleStatus("quote_sent")).toBe(false);
    expect(isQueueEligibleStatus("cancelled")).toBe(false);
    expect(isQueueEligibleStatus("active")).toBe(true);
    expect(isQueueEligibleStatus("pending")).toBe(true);

    const ranked = rankPriorityQueue(
      [
        row({
          id: "quote",
          status: "quote_sent",
          renewalAt: new Date("2026-09-08T16:00:00.000Z"),
          premium: 321000,
          accountName: "Dib, Ana",
        }),
        row({
          id: "book",
          status: "active",
          renewalAt: new Date("2026-10-01T16:00:00.000Z"),
          premium: 2184,
          accountName: "Hale",
        }),
      ],
      asOf,
    );
    expect(ranked.map((item) => item.id)).toEqual(["book"]);
  });

  it("uses renewalDate when present, else expiration", () => {
    const exp = new Date("2026-12-01T16:00:00.000Z");
    const renewal = new Date("2026-11-15T16:00:00.000Z");
    expect(renewalAt({ expirationDate: exp, renewalDate: renewal })).toBe(renewal);
    expect(renewalAt({ expirationDate: exp, renewalDate: null })).toBe(exp);
  });

  it("labels personal contacts Last, First and businesses by legal name", () => {
    expect(accountLabel({ firstName: "Elena", lastName: "Ruiz" }, null)).toBe("Ruiz, Elena");
    expect(accountLabel(null, { name: "Harbor Key Marine LLC" })).toBe(
      "Harbor Key Marine LLC",
    );
    expect(accountLabel(null, null)).toBe("—");
  });

  it("does not invent an Ana policy — she stays shopping at Cov A $321,000", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
    expect(CONTACT_ID).toBe("22222222-2222-4222-8222-222222222224");
    const anaShop: PriorityQueueInput[] = [];
    expect(rankPriorityQueue(anaShop, asOf)).toEqual([]);
  });

  it("totals $ at risk without mixing quote coverage A", () => {
    const rows: PriorityQueueRow[] = [
      {
        id: "a",
        policyNumber: "HO3-ELENA-2026",
        status: "active",
        accountName: "Ruiz, Elena",
        href: "/policies/a",
        dueAt: new Date("2026-09-20T16:00:00.000Z"),
        priority: "High",
        dollarsAtRisk: 1840,
        daysToRenewal: 17,
      },
      {
        id: "b",
        policyNumber: "GL-HARBOR-2026",
        status: "active",
        accountName: "Harbor Key Marine LLC",
        href: "/policies/b",
        dueAt: new Date("2026-10-01T16:00:00.000Z"),
        priority: "Normal",
        dollarsAtRisk: 4200,
        daysToRenewal: 28,
      },
    ];
    expect(queueTotals(rows)).toEqual({
      count: 2,
      dollarsAtRisk: 6040,
      highest: 0,
      high: 1,
    });
    expect(comparePriorityQueue(rows[0]!, rows[1]!)).toBeLessThan(0);
  });
});
