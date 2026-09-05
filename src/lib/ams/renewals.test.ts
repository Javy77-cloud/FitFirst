import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  buildRenewalRow,
  isUpcomingRenewal,
  renewalFollowupBody,
  sortRenewalRows,
} from "./renewals";

describe("renewal pipeline", () => {
  it("includes Hale (28 days) and Nair (73 days) in the right windows", () => {
    const hale = { status: "active", expirationDate: "2026-10-01" };
    const nair = { status: "active", expirationDate: "2026-11-15" };
    const elena = { status: "active", expirationDate: "2027-09-01" };
    expect(isUpcomingRenewal(hale, 30, DESK_AS_OF)).toBe(true);
    expect(isUpcomingRenewal(nair, 30, DESK_AS_OF)).toBe(false);
    expect(isUpcomingRenewal(nair, 90, DESK_AS_OF)).toBe(true);
    expect(isUpcomingRenewal(elena, 60, DESK_AS_OF)).toBe(false);
    expect(isUpcomingRenewal({ status: "quoted", expirationDate: "2026-10-01" }, 30)).toBe(
      false,
    );
  });

  it("compares current vs proposed premium without inventing a rater", () => {
    const row = buildRenewalRow({
      id: "hale",
      policyNumber: "HP-FL-88421",
      status: "active",
      lineOfBusiness: "HO3",
      expirationDate: "2026-10-01",
      premium: "2184.00",
      partyName: "Hale, Jordan",
      carrierName: "Heritage",
      currentPremium: "2184.00",
      proposedPremium: "2547.00",
    });
    expect(row?.daysUntil).toBe(28);
    expect(row?.delta).toBe(363);
    expect(row?.pct).toBeCloseTo(0.1662, 3);
  });

  it("sorts soonest first and writes an in-app follow-up body", () => {
    const hale = buildRenewalRow({
      id: "h",
      policyNumber: "HP-FL-88421",
      status: "active",
      lineOfBusiness: "HO3",
      expirationDate: "2026-10-01",
      premium: "2184.00",
      partyName: "Hale, Jordan",
      carrierName: "Heritage",
    });
    const nair = buildRenewalRow({
      id: "n",
      policyNumber: "PA-FL-22910",
      status: "active",
      lineOfBusiness: "AUTO",
      expirationDate: "2026-11-15",
      premium: "1428.00",
      partyName: "Nair, Priya",
      carrierName: "QBE",
    });
    expect(hale && nair).toBeTruthy();
    if (!hale || !nair) return;
    expect(sortRenewalRows([nair, hale]).map((row) => row.policyNumber)).toEqual([
      "HP-FL-88421",
      "PA-FL-22910",
    ]);
    expect(renewalFollowupBody(hale).toLowerCase()).toContain("in-desk only — no email");
    expect(renewalFollowupBody(hale)).toContain("HP-FL-88421");
  });
});
