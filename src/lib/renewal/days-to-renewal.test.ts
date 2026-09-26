import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCurrentTerm } from "@/lib/policies/current-term";
import { renewalClock } from "@/lib/renewal/days-to-renewal";
import { renewalClockPhrase, renewalUrgencyBand, renewalWhyLine } from "@/lib/renewal/urgency";

/** Noon Eastern on the audit day (2026-09-26). */
const AS_OF = new Date("2026-09-26T16:00:00.000Z");

describe("renewals board days-to-renewal", () => {
  it("puts ATM205086 on the renew-into effective (~14 days, under 30), not the year-ahead expiration", () => {
    const rigby = {
      status: "active",
      policyNumber: "ATM205086",
      effectiveDate: "2026-10-10",
      expirationDate: "2027-10-10",
      renewalDate: "2027-10-10",
      premium: "3678.00",
      terms: [
        { role: "current", effective: "2026-10-10", expiration: "2027-10-10", premium: "3678.00" },
        { role: "proposed", effective: "2026-10-10", expiration: "2027-10-10", premium: "3678.00" },
      ],
    };
    expect(resolveCurrentTerm(rigby, AS_OF).daysLeft).toBe(379);
    const clock = renewalClock(rigby, AS_OF);
    expect(clock.days).toBe(14);
    expect(clock.anchor).toBe("renew_into_effective");
    expect(renewalUrgencyBand(clock.days ?? 0)).toBe("under30");
    expect(renewalClockPhrase(14, "renew_into_effective")).toBe("Renews in 14 days");
    expect(renewalWhyLine({ daysUntil: 14, clockAnchor: "renew_into_effective" })).toBe(
      "Renews in 14 days",
    );
  });

  it("keeps an in-force term on its expiration when renewal_date has jumped a year", () => {
    const nearerExpiration = {
      status: "active",
      policyNumber: "09 1151711624 08",
      effectiveDate: "2025-11-04",
      expirationDate: "2026-11-04",
      renewalDate: "2027-11-04",
      terms: [{ role: "current", effective: "2025-11-04", expiration: "2026-11-04" }],
    };
    const clock = renewalClock(nearerExpiration, AS_OF);
    expect(clock.anchor).toBe("in_force_expiration");
    expect(clock.days).toBe(39);
    expect(resolveCurrentTerm(nearerExpiration, AS_OF).daysLeft).toBe(39);
    expect(renewalUrgencyBand(39)).toBe("30to60");

    const started = {
      status: "active",
      policyNumber: "1000015768HO4",
      effectiveDate: "2026-07-31",
      expirationDate: "2027-07-31",
      renewalDate: "2027-07-30",
      terms: [
        { role: "prior", effective: "2025-07-31", expiration: "2026-07-30" },
        { role: "current", effective: "2026-07-31", expiration: "2027-07-31" },
      ],
    };
    const startedClock = renewalClock(started, AS_OF);
    expect(startedClock.anchor).toBe("in_force_expiration");
    expect(startedClock.days).toBe(308);
    expect(resolveCurrentTerm(started, AS_OF).daysLeft).toBe(308);
    expect(renewalUrgencyBand(308)).toBe("90plus");
  });

  it("feeds the renewals board card from the shared clock", () => {
    const board = readFileSync("src/lib/renewal/board-data.ts", "utf8");
    expect(board).toMatch(/daysUntilRenewalEvent/);
    expect(board).toMatch(/clockAnchor: clock\.anchor/);
    const card = readFileSync("src/components/renewals/renewal-card.tsx", "utf8");
    const footer = card.slice(card.indexOf("ff-renewal-card-footer"));
    expect(footer).toMatch(/data-ff-renewal-compare-open/);
    expect(footer).toMatch(/Compare/);
  });
});
