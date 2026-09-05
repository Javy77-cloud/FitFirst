import { describe, expect, it } from "vitest";
import {
  commissionsHref,
  filterCommissionRows,
  matchesCommissionBook,
  matchesCommissionStatus,
  scopeCommissionRows,
  subfiltersFor,
} from "./filters";
import { nextCalendarQuarter, rangeWindow } from "./windows";

const now = new Date("2026-09-03T16:00:00.000Z");

describe("commission book filters", () => {
  it("splits Life / Health / P&C and their subfilters", () => {
    expect(matchesCommissionBook({ status: "pending", lineOfBusiness: "HO" }, "pc", "home")).toBe(
      true,
    );
    expect(matchesCommissionBook({ status: "pending", lineOfBusiness: "AUTO" }, "pc", "home")).toBe(
      false,
    );
    expect(matchesCommissionBook({ status: "pending", lineOfBusiness: "GL" }, "pc", "commercial")).toBe(
      true,
    );
    expect(matchesCommissionBook({ status: "pending", lineOfBusiness: "LIFE" }, "life")).toBe(true);
    expect(
      matchesCommissionBook(
        { status: "pending", lineOfBusiness: "LIFE", policySubType: "Term Life" },
        "life",
        "term",
      ),
    ).toBe(true);
    expect(
      matchesCommissionBook(
        { status: "pending", lineOfBusiness: "HEALTH", policySubType: "Medicare Advantage" },
        "health",
        "medicare",
      ),
    ).toBe(true);
    expect(matchesCommissionBook({ status: "pending", lineOfBusiness: "LIFE" }, "pc")).toBe(false);
    expect(
      matchesCommissionBook(
        { status: "pending", insuranceType: "P&C", policyType: "Renter & Landord", policySubType: "DP3" },
        "pc",
        "home",
      ),
    ).toBe(true);
    expect(
      matchesCommissionBook(
        { status: "pending", insuranceType: "P&C", policyType: "Commercial", policySubType: "Workers' Comp" },
        "pc",
        "commercial",
      ),
    ).toBe(true);
    expect(
      matchesCommissionBook(
        { status: "pending", insuranceType: "Life", policySubType: "Accidental Death" },
        "life",
        "accidental",
      ),
    ).toBe(true);
    expect(subfiltersFor("pc").map((row) => row.value)).toEqual([
      "home",
      "auto",
      "flood",
      "commercial",
    ]);
  });

  it("splits pending vs paid without mixing the two", () => {
    expect(matchesCommissionStatus("pending", "pending")).toBe(true);
    expect(matchesCommissionStatus("payable", "pending")).toBe(true);
    expect(matchesCommissionStatus("held", "pending")).toBe(true);
    expect(matchesCommissionStatus("paid", "pending")).toBe(false);
    expect(matchesCommissionStatus("paid", "paid")).toBe(true);
    expect(matchesCommissionStatus("pending", "paid")).toBe(false);
    expect(matchesCommissionStatus("held", "all")).toBe(true);
  });

  it("keeps an agent on their own rows and builds filter hrefs", () => {
    const scoped = scopeCommissionRows(
      [
        { agentId: "maya", status: "pending" },
        { agentId: "javy", status: "paid" },
      ],
      { isAdmin: false, viewerId: "maya" },
    );
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.agentId).toBe("maya");
    expect(scopeCommissionRows(scoped, { isAdmin: true, viewerId: "maya" })).toHaveLength(1);
    expect(commissionsHref({ status: "pending", family: "life", sub: "term" })).toBe(
      "/commissions?status=pending&family=life&sub=term",
    );
    expect(commissionsHref({ status: "all", range: "all" })).toBe("/commissions");
  });

  it("keeps Ana-shaped shopping rows out of a P&C paid last-month cut", () => {
    const rows = filterCommissionRows(
      [
        {
          status: "pending",
          lineOfBusiness: "HO",
          dueDate: "2026-10-15T00:00:00.000Z",
          paidDate: null,
          createdAt: "2026-09-02T00:00:00.000Z",
        },
        {
          status: "paid",
          lineOfBusiness: "HO",
          paidDate: "2026-08-12T00:00:00.000Z",
          dueDate: null,
        },
      ],
      { family: "pc", sub: "home", range: "last_month" },
      now,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("paid");
  });
});

describe("commission period windows", () => {
  it("covers last year / last 6 / last 3 / last month and last quarter", () => {
    const lastYear = rangeWindow("last_year", now);
    expect(lastYear.start?.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(lastYear.end?.toISOString()).toBe("2026-01-01T00:00:00.000Z");

    const last6 = rangeWindow("last_6_months", now);
    expect(last6.start?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(last6.end?.toISOString()).toBe(now.toISOString());

    const last3 = rangeWindow("last_3_months", now);
    expect(last3.start?.toISOString()).toBe("2026-06-01T00:00:00.000Z");

    const lastMonth = rangeWindow("last_month", now);
    expect(lastMonth.start?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(lastMonth.end?.toISOString()).toBe("2026-09-01T00:00:00.000Z");

    const lastQ = rangeWindow("last_quarter", now);
    expect(lastQ.start?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(lastQ.end?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("covers forward next month / quarter / year and 3 / 6 month look-aheads", () => {
    const nextMonth = rangeWindow("next_month", now);
    expect(nextMonth.upcoming).toBe(true);
    expect(nextMonth.start?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(nextMonth.end?.toISOString()).toBe("2026-11-01T00:00:00.000Z");

    const next3 = rangeWindow("next_3_months", now);
    expect(next3.start?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(next3.end?.toISOString()).toBe("2027-01-01T00:00:00.000Z");

    const next6 = rangeWindow("next_6_months", now);
    expect(next6.end?.toISOString()).toBe("2027-04-01T00:00:00.000Z");

    const nextQ = nextCalendarQuarter(now);
    expect(nextQ.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(nextQ.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");

    const nextYear = rangeWindow("next_year", now);
    expect(nextYear.start?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(nextYear.end?.toISOString()).toBe("2028-01-01T00:00:00.000Z");
  });
});
