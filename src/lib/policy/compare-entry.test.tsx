import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareTermsLink } from "@/components/policy/compare-terms-link";
import { buildPolicyCareItems } from "@/lib/policy/care-strip";
import {
  policyComparePair,
  selectPolicyCompareTerms,
  showPolicyCompareTerms,
} from "@/lib/policy/compare-entry";

describe("Compare terms stays after the renewal-agreed stamp", () => {
  it("keeps Compare when renewalHandled / the stamp is on, including after in-force chase drops", () => {
    expect(showPolicyCompareTerms({ inForce: true, renewalAgreed: true })).toBe(true);
    expect(showPolicyCompareTerms({ inForce: false, renewalAgreed: true })).toBe(true);
    expect(showPolicyCompareTerms({ inForce: true, renewalAgreed: false })).toBe(true);
    expect(showPolicyCompareTerms({ inForce: false, renewalAgreed: false })).toBe(false);
  });

  it("renders the persistent Compare control to the policy compare page", () => {
    const html = renderToStaticMarkup(
      <CompareTermsLink policyId="atm-205086" persistent />,
    );
    expect(html).toContain("Compare terms");
    expect(html).toContain('href="/policies/atm-205086/compare"');
    expect(html).toContain("data-ff-compare-terms");
    expect(html).toContain("data-ff-compare-terms-persistent");
    expect(html).toContain("prior term vs current term");
  });

  it("leaves the unstamped Compare control on current vs upcoming", () => {
    const html = renderToStaticMarkup(<CompareTermsLink policyId="atm-205086" />);
    expect(html).toContain('href="/policies/atm-205086/compare"');
    expect(html).toContain("current vs upcoming");
    expect(html).not.toContain("data-ff-compare-terms-persistent");
  });

  it("compares prior vs current only after the stamp, once proposed is gone", () => {
    expect(
      policyComparePair({
        renewalHandled: false,
        hasPrior: true,
        hasCurrent: true,
        hasProposed: false,
      }).kind,
    ).toBe("current-proposed");
    expect(
      policyComparePair({
        renewalHandled: true,
        hasPrior: true,
        hasCurrent: true,
        hasProposed: true,
      }).kind,
    ).toBe("current-proposed");
    expect(
      policyComparePair({
        renewalHandled: true,
        hasPrior: true,
        hasCurrent: true,
        hasProposed: false,
      }),
    ).toEqual({
      kind: "prior-current",
      baselineLabel: "Prior term",
      renewalLabel: "Current term",
    });
  });

  it("picks the latest prior against the current term when the stamp is on", () => {
    const terms = [
      { id: "old", role: "prior", termEffective: "2024-10-10" },
      { id: "previous", role: "prior", termEffective: "2025-10-10" },
      { id: "now", role: "current", termEffective: "2026-10-10" },
    ];
    const selected = selectPolicyCompareTerms(terms, true);
    expect(selected.pair.kind).toBe("prior-current");
    expect(selected.baseline?.id).toBe("previous");
    expect(selected.renewal?.id).toBe("now");
    expect(selected.roleCurrent?.id).toBe("now");
    expect(selected.roleProposed).toBeUndefined();

    const unstamped = selectPolicyCompareTerms(
      [...terms, { id: "quote", role: "proposed", termEffective: "2027-10-10" }],
      false,
    );
    expect(unstamped.pair.kind).toBe("current-proposed");
    expect(unstamped.baseline?.id).toBe("now");
    expect(unstamped.renewal?.id).toBe("quote");
  });

  it("places persistent Compare in Links & renewal and does not bring Client staying chase back", () => {
    const overview = readFileSync("src/components/policy/tabs/overview-tab.tsx", "utf8");
    const sectionStart = overview.indexOf('data-ff-policy-links-renewal=""');
    const sectionEnd = overview.indexOf("<PremiumChangeSummary");
    const section = overview.slice(sectionStart, sectionEnd);
    expect(section).toContain("ff-links-renewal-heading");
    expect(section).toContain("<CompareTermsLink");
    expect(section).toMatch(/showRenewalAgreed \? \(\s*<CompareTermsLink[\s\S]*?persistent/);
    expect(section).toMatch(/inForce && !showRenewalAgreed \? \(\s*<CompareTermsLink/);
    expect(section).toMatch(
      /\{inForce \? \(\s*<span className="ff-links-renewal-staying">\s*<ClientStayingButton/,
    );
    expect(readFileSync("src/components/policy/compare-panel.tsx", "utf8")).toMatch(
      /renewalHandled \? null : \(\s*<ClientStayingButton/,
    );
    expect(
      buildPolicyCareItems({
        expirationDate: "2026-10-09",
        status: "active",
        asOf: new Date("2026-09-26T16:00:00.000Z"),
        renewalHandled: true,
      }).some((item) => item.key === "renewal"),
    ).toBe(false);
  });
});
