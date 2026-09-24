import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  derivedNextTermStart,
  renewalAgreedEffectiveDate,
  showRenewalAgreedStamp,
} from "@/lib/policies/renewal-agreed";

const term = {
  clientStaying: true,
  effectiveDate: "2025-10-10",
  expirationDate: "2026-10-09",
};

describe("renewal agreed stamp", () => {
  it("a 10-10-2025 to 10-9-2026 term renews effective 10-10-2026", () => {
    expect(derivedNextTermStart("2025-10-10", "2026-10-09")).toBe("2026-10-10");
    expect(renewalAgreedEffectiveDate(term)).toBe("2026-10-10");
  });

  it("treats an exclusive expiration as the next term start", () => {
    expect(derivedNextTermStart("2025-10-10", "2026-10-10")).toBe("2026-10-10");
    expect(derivedNextTermStart("2025-10-01", "2026-10-01")).toBe("2026-10-01");
    expect(derivedNextTermStart("2025-07-30", "2026-07-30")).toBe("2026-07-30");
    expect(derivedNextTermStart("2026-07-30", "2027-07-29")).toBe("2027-07-30");
  });

  it("uses a recorded renewed-term effective date", () => {
    expect(
      renewalAgreedEffectiveDate({
        effectiveDate: "2025-10-10",
        expirationDate: "2026-10-09",
        renewedEffectiveDate: "2026-12-01",
      }),
    ).toBe("2026-12-01");
    expect(
      renewalAgreedEffectiveDate({
        effectiveDate: "2025-10-10",
        expirationDate: "2026-10-10",
        terms: [
          { role: "current", termEffective: "2025-10-10", termExpiration: "2026-10-10" },
          { role: "proposed", termEffective: "2026-11-01", termExpiration: "2027-11-01" },
        ],
      }),
    ).toBe("2026-11-01");
  });

  it("is shown when Client staying and before the renewal effective date", () => {
    expect(showRenewalAgreedStamp(term, new Date("2026-10-09T16:00:00.000Z"))).toBe(true);
    expect(showRenewalAgreedStamp(term, new Date("2026-09-01T16:00:00.000Z"))).toBe(true);
  });

  it("keeps an exclusive expiration in force through the day before", () => {
    const exclusive = {
      clientStaying: true,
      effectiveDate: "2025-10-10",
      expirationDate: "2026-10-10",
    };
    expect(showRenewalAgreedStamp(exclusive, new Date("2026-10-09T16:00:00.000Z"))).toBe(true);
    expect(showRenewalAgreedStamp(exclusive, new Date("2026-10-10T16:00:00.000Z"))).toBe(false);
  });

  it("clears on the renewal effective date in America/New_York", () => {
    expect(showRenewalAgreedStamp(term, new Date("2026-10-10T16:00:00.000Z"))).toBe(false);
    // 8:30 PM EDT on Oct 9 is 00:30 UTC on Oct 10. Still the day before.
    expect(showRenewalAgreedStamp(term, new Date("2026-10-10T00:30:00.000Z"))).toBe(true);
    // 12:30 AM EDT on Oct 10 is 04:30 UTC. The renewed term's day has started.
    expect(showRenewalAgreedStamp(term, new Date("2026-10-10T04:30:00.000Z"))).toBe(false);
  });

  it("is hidden when the policy is not Client staying", () => {
    expect(
      showRenewalAgreedStamp(
        { ...term, clientStaying: false },
        new Date("2026-09-01T16:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      showRenewalAgreedStamp(
        { clientStaying: false, effectiveDate: "2025-10-10", expirationDate: "2026-10-10" },
        new Date("2026-10-01T16:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("is hidden when no renewal effective date can be derived", () => {
    expect(showRenewalAgreedStamp({ clientStaying: true }, new Date("2026-09-01T16:00:00.000Z"))).toBe(
      false,
    );
    expect(renewalAgreedEffectiveDate({})).toBeNull();
  });

  it("places the dossier stamp in the policy overview Links & renewal section", () => {
    const overview = readFileSync("src/components/policy/tabs/overview-tab.tsx", "utf8");
    const stamp = readFileSync("src/components/policy/renewal-agreed-stamp.tsx", "utf8");
    const linksAt = overview.indexOf("Links & renewal");
    const stampAt = overview.indexOf("<RenewalAgreedStamp");
    expect(linksAt).toBeGreaterThan(-1);
    expect(stampAt).toBeGreaterThan(linksAt);
    expect(overview).toMatch(/showRenewalAgreedStamp/);
    expect(stamp).toMatch(/ff-deal-status-stamp/);
    expect(stamp).toMatch(/ff-deal-status-stamp-ink/);
    expect(stamp).toMatch(/RENEWAL_AGREED_LABEL/);
    expect(readFileSync("src/lib/policies/renewal-agreed.ts", "utf8")).toContain("Renewal agreed");
    expect(readFileSync("src/app/policies/[id]/page.tsx", "utf8")).toMatch(/renewalHandled=\{renewalHandled\}/);
  });
});
