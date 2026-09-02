import { describe, expect, it } from "vitest";
import { commissionAmount, periodKey } from "./math";
import {
  rollupByAgent,
  rollupByCarrier,
  rollupByLine,
  widgetTotals,
  type CommissionRollupRow,
} from "./rollups";
import { fiscalYearBounds, lastCalendarQuarter, rangeWindow } from "./windows";

const now = new Date("2026-09-02T16:00:00.000Z");

const rows: CommissionRollupRow[] = [
  {
    agentId: "javy",
    agentName: "Javy Rivera",
    carrierId: "ai",
    carrierName: "American Integrity",
    lineOfBusiness: "HO",
    premium: "2184.00",
    amount: "262.08",
    status: "pending",
  },
  {
    agentId: "maya",
    agentName: "Maya Chen",
    carrierId: "tr",
    carrierName: "Tailrow",
    lineOfBusiness: "HO",
    premium: 1960,
    amount: 215.6,
    status: "payable",
  },
  {
    agentId: "maya",
    agentName: "Maya Chen",
    carrierId: "bm",
    carrierName: "Benchmark",
    lineOfBusiness: "AUTO",
    premium: 1420,
    amount: 142,
    status: "paid",
  },
];

describe("commission math", () => {
  it("computes producer pay from premium and rate, not a quote floor", () => {
    expect(commissionAmount(2184, 12)).toBe(262.08);
    expect(commissionAmount(1420, 10)).toBe(142);
    expect(periodKey(new Date("2026-09-02T00:00:00.000Z"))).toBe("2026-09");
  });
});

describe("period windows", () => {
  it("uses Jan–Dec fiscal year unless a start month is set", () => {
    const jan = fiscalYearBounds(now, 1);
    expect(jan.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(jan.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");

    const july = fiscalYearBounds(now, 7);
    expect(july.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("treats last quarter as the previous calendar quarter", () => {
    const q = lastCalendarQuarter(now);
    expect(q.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(q.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("scopes last 30 days and upcoming to the right statuses", () => {
    const last30 = rangeWindow("last_30", now);
    expect(last30.statuses).toEqual(["paid"]);
    expect(last30.start?.toISOString()).toBe("2026-08-03T16:00:00.000Z");

    const upcoming = rangeWindow("upcoming", now);
    expect(upcoming.upcoming).toBe(true);
    expect(upcoming.statuses).toEqual(["pending", "payable"]);
  });
});

describe("agency rollups", () => {
  it("rolls sales and commission per agent, carrier, and line", () => {
    const agents = rollupByAgent(rows);
    expect(agents).toHaveLength(2);
    expect(agents[0]?.label).toBe("Maya Chen");
    expect(agents.find((a) => a.key === "javy")?.commission).toBeCloseTo(262.08);
    expect(agents.find((a) => a.key === "maya")?.commission).toBeCloseTo(357.6);

    const carriers = rollupByCarrier(rows);
    expect(carriers.map((c) => c.label)).toEqual([
      "American Integrity",
      "Tailrow",
      "Benchmark",
    ]);

    const lines = rollupByLine(rows);
    const ho = lines.find((l) => l.key === "HO");
    expect(ho?.premium).toBeCloseTo(4144);
    expect(ho?.count).toBe(2);
  });

  it("builds dashboard widgets from pending, paid last 30d, and upcoming due", () => {
    const totals = widgetTotals(
      [
        { amount: "262.08", status: "pending", dueDate: "2026-09-14T00:00:00.000Z", paidDate: null },
        { amount: "184.00", status: "paid", dueDate: null, paidDate: "2026-08-15T00:00:00.000Z" },
        { amount: "96.00", status: "payable", dueDate: "2026-09-23T00:00:00.000Z", paidDate: null },
        { amount: "50.00", status: "paid", dueDate: null, paidDate: "2026-06-01T00:00:00.000Z" },
      ],
      now,
    );
    expect(totals.pending).toBeCloseTo(262.08);
    expect(totals.paidLast30).toBeCloseTo(184);
    expect(totals.upcoming).toBeCloseTo(358.08);
  });
});
