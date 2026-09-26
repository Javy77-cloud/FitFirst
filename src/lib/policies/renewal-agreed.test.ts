import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clientStayingTermHasStarted,
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

  it("prefers a stored policy renewal date and derives only when it is blank", () => {
    const calendarYear = {
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      renewedEffectiveDate: "2026-11-01",
      terms: [{ role: "proposed", termEffective: "2026-11-01", termExpiration: "2027-11-01" }],
    };
    expect(renewalAgreedEffectiveDate({ ...calendarYear, renewalDate: "2027-02-01" })).toBe("2027-02-01");
    expect(renewalAgreedEffectiveDate({ ...calendarYear, renewalDate: null })).toBe("2026-11-01");
    expect(renewalAgreedEffectiveDate({ ...calendarYear, renewalDate: "" })).toBe("2026-11-01");
  });

  it("Marketplace, Medicare, and PNC calendar terms renew January 1 when renewal date is blank", () => {
    expect(derivedNextTermStart("2026-01-01", "2026-12-31")).toBe("2027-01-01");
    const calendarYear = {
      clientStaying: true,
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      renewalDate: null as string | null,
    };
    expect(renewalAgreedEffectiveDate(calendarYear)).toBe("2027-01-01");
    expect(showRenewalAgreedStamp(calendarYear, new Date("2026-12-31T17:00:00.000Z"))).toBe(true);
    expect(showRenewalAgreedStamp(calendarYear, new Date("2027-01-01T17:00:00.000Z"))).toBe(false);
    // 7:30 PM EST on Dec 31 is 00:30 UTC on Jan 1. Still the day before.
    expect(showRenewalAgreedStamp(calendarYear, new Date("2027-01-01T00:30:00.000Z"))).toBe(true);
    // 12:30 AM EST on Jan 1 is 05:30 UTC.
    expect(showRenewalAgreedStamp(calendarYear, new Date("2027-01-01T05:30:00.000Z"))).toBe(false);
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

  it("clears on the renew-into effective date when renewal_date has jumped a year", () => {
    const asOfBefore = new Date("2026-10-09T16:00:00.000Z");
    const asOfOn = new Date("2026-10-10T16:00:00.000Z");
    const jumped = {
      clientStaying: true,
      effectiveDate: "2025-10-10",
      expirationDate: "2026-10-09",
      renewalDate: "2027-10-10",
    };
    expect(renewalAgreedEffectiveDate(jumped, asOfBefore)).toBe("2026-10-10");
    expect(showRenewalAgreedStamp(jumped, asOfBefore)).toBe(true);
    expect(showRenewalAgreedStamp(jumped, asOfOn)).toBe(false);
    expect(clientStayingTermHasStarted(jumped, asOfBefore)).toBe(false);
    expect(clientStayingTermHasStarted(jumped, asOfOn)).toBe(true);
  });

  it("keeps an upcoming effective (ATM205086) until that date, not next year's renewal_date", () => {
    const atm = {
      clientStaying: true,
      effectiveDate: "2026-10-10",
      expirationDate: "2027-10-10",
      renewalDate: "2027-10-10",
      handledAt: "2026-09-23T11:41:19.681Z",
    };
    const before = new Date("2026-09-26T16:00:00.000Z");
    const morning = new Date("2026-10-10T16:00:00.000Z");
    expect(renewalAgreedEffectiveDate(atm, before)).toBe("2026-10-10");
    expect(showRenewalAgreedStamp(atm, before)).toBe(true);
    expect(showRenewalAgreedStamp(atm, new Date("2026-10-09T16:00:00.000Z"))).toBe(true);
    expect(showRenewalAgreedStamp(atm, morning)).toBe(false);
    expect(clientStayingTermHasStarted(atm, before)).toBe(false);
    expect(clientStayingTermHasStarted(atm, morning)).toBe(true);
  });

  it("hides the stamp after the renewed term has started when the mark predates that term", () => {
    const zoila = {
      clientStaying: true,
      effectiveDate: "2026-07-31",
      expirationDate: "2027-07-31",
      renewalDate: "2027-07-30",
      priorExpiration: "2026-07-30",
      handledAt: "2026-06-15T16:00:00.000Z",
      terms: [
        { role: "prior", termEffective: "2025-07-31", termExpiration: "2026-07-30" },
        { role: "current", termEffective: "2026-07-31", termExpiration: "2027-07-31" },
      ],
    };
    const renewDay = new Date("2026-07-31T16:00:00.000Z");
    const after = new Date("2026-09-26T16:00:00.000Z");
    expect(renewalAgreedEffectiveDate(zoila, after)).toBe("2026-07-31");
    expect(showRenewalAgreedStamp(zoila, renewDay)).toBe(false);
    expect(showRenewalAgreedStamp(zoila, after)).toBe(false);
    expect(clientStayingTermHasStarted(zoila, after)).toBe(true);
  });

  it("keeps a fresh mark after term start pointed at the next cycle", () => {
    const remarked = {
      clientStaying: true,
      effectiveDate: "2026-07-31",
      expirationDate: "2027-07-31",
      renewalDate: "2027-07-30",
      priorExpiration: "2026-07-30",
      handledAt: "2026-09-26T16:00:00.000Z",
    };
    const after = new Date("2026-09-26T16:00:00.000Z");
    expect(renewalAgreedEffectiveDate(remarked, after)).toBe("2027-07-30");
    expect(showRenewalAgreedStamp(remarked, after)).toBe(true);
    expect(clientStayingTermHasStarted(remarked, after)).toBe(false);
  });

  it("is hidden when no renewal effective date can be derived", () => {
    expect(showRenewalAgreedStamp({ clientStaying: true }, new Date("2026-09-01T16:00:00.000Z"))).toBe(
      false,
    );
    expect(renewalAgreedEffectiveDate({})).toBeNull();
  });

  it("places a larger centered stamp beside Client staying in Links & renewal", () => {
    const overview = readFileSync("src/components/policy/tabs/overview-tab.tsx", "utf8");
    const stamp = readFileSync("src/components/policy/renewal-agreed-stamp.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    const sectionStart = overview.indexOf('data-ff-policy-links-renewal=""');
    const sectionEnd = overview.indexOf("<PremiumChangeSummary");
    const section = overview.slice(sectionStart, sectionEnd);
    expect(sectionStart).toBeGreaterThan(-1);
    expect(section).toContain("Links & renewal");
    expect(section).toContain("<RenewalAgreedStamp");
    expect(section).toContain("ff-links-renewal-copy");
    expect(section).not.toMatch(/justify-center|py-5/);
    expect(overview).toMatch(/showRenewalAgreedStamp/);
    expect(overview).toMatch(/renewalDate:\s*policy\.renewalDate/);
    expect(stamp).toMatch(/ff-deal-status-stamp/);
    expect(stamp).toMatch(/ff-deal-status-stamp-ink/);
    expect(stamp).toMatch(/data-ff-deal-status-stamp="done"/);
    expect(stamp).toMatch(/data-ff-renewal-agreed-stamp/);
    expect(stamp).toMatch(/RENEWAL_AGREED_LABEL/);
    expect(section).toContain("ff-links-renewal-staying");
    expect(css).toMatch(/\.ff-renewal-agreed-stamp\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/anchor\(right\) \+ 12px/);
    expect(css).toMatch(/translateY\(calc\(-50% \+ 10px\)\)/);
    expect(css).toMatch(/\[data-ff-renewal-agreed-stamp\] \.ff-deal-status-stamp-ink\s*\{[^}]*font-size:\s*2\.05rem/);
    expect(css).toMatch(/\[data-ff-renewal-agreed-stamp\] \.ff-deal-status-stamp-ink\s*\{[^}]*border-width:\s*6px/);
    expect(css).not.toMatch(/ff-renewal-agreed-ink-hit/);
    expect(css).toMatch(/@keyframes ff-stamp-ink-hit[\s\S]*?100%[\s\S]*?rotate\(-8deg\)/);
    const inkRule =
      css.match(/\[data-ff-renewal-agreed-stamp\] \.ff-deal-status-stamp-ink \{[^}]*\}/)?.[0] ?? "";
    expect(inkRule).not.toMatch(/rotate\(/);
    expect(css).toMatch(/@container \(max-width: 40rem\)/);
    expect(css).not.toMatch(/max-width:\s*calc\(100% - 13rem\)/);
    expect(readFileSync("src/lib/policies/renewal-agreed.ts", "utf8")).toContain("Renewal agreed");
    expect(readFileSync("src/app/policies/[id]/page.tsx", "utf8")).toMatch(
      /isRenewalHandledStageValue\(renewalQueueRow\?\.stage\)/,
    );
    expect(readFileSync("src/app/policies/[id]/page.tsx", "utf8")).toMatch(/renewalHandled=\{renewalHandled\}/);
  });
});
