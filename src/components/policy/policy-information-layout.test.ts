import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PolicyInformationCard } from "@/components/policy/policy-information";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const source = readFileSync("src/components/policy/policy-information.tsx", "utf8");

/** Markers in the Policy Information grid, in DOM order. */
const GRID_MARKERS = [
  ">Insured</dt>",
  "<PolicyCarrierLookup",
  'fieldKey="policyNumber"',
  'fieldKey="policySubType"',
  "data-ff-policy-premises-row",
  'data-ff-policy-mailing=""',
  "data-ff-policy-mailing-placeholder",
  'fieldKey="insuranceType"',
  'fieldKey="sellingAgency"',
  'data-ff-policy-inline="producer"',
  'data-ff-policy-inline="effectiveDate"',
  'data-ff-policy-inline="expirationDate"',
  'data-ff-policy-inline="renewalDate"',
  'fieldKey="billingFrequency"',
  'fieldKey="premium"',
  'data-ff-policy-inline="commission4Pct-locked"',
  "data-ff-term-override-control",
] as const;

const policy = {
  id: "pol-1",
  policyNumber: "DP3-100",
  status: "active",
  lineOfBusiness: "HO",
  insuranceType: "P&C",
  policySubType: "DP3",
  effectiveDate: "2026-01-01",
  expirationDate: "2027-01-01",
  renewalDate: "2027-01-01",
  premium: "1200",
  billingFrequency: "annual",
  sellingAgency: "AFA",
  premisesAddress: "10 Rental St",
  premisesCity: "Melbourne",
  premisesState: "FL",
  premisesZip: "32935",
  commission4Pct: "10",
};

function orderOf(html: string, markers: string[]): number[] {
  return markers.map((marker) => html.indexOf(marker));
}

describe("Policy Information card grid order", () => {
  it("keeps Billing under Producer and Premium under Effective, then term dates", () => {
    const positions = GRID_MARKERS.map((marker) => source.indexOf(marker));
    expect(positions.every((index) => index >= 0)).toBe(true);
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it("reserves the owner-mailing slot when that cell is absent", () => {
    expect(source).toMatch(/data-ff-policy-mailing-placeholder=""/);
    expect(source).not.toMatch(/data-ff-billing-row-spacer/);
  });

  it("does not pull Billing ahead of the term dates in source order", () => {
    const producer = source.indexOf('data-ff-policy-inline="producer"');
    const effective = source.indexOf('data-ff-policy-inline="effectiveDate"');
    const expiration = source.indexOf('data-ff-policy-inline="expirationDate"');
    const renewal = source.indexOf('data-ff-policy-inline="renewalDate"');
    const billing = source.indexOf('fieldKey="billingFrequency"');
    const premium = source.indexOf('fieldKey="premium"');
    const commission = source.indexOf('data-ff-policy-inline="commission4Pct-locked"');
    const termControl = source.indexOf("data-ff-term-override-control");
    expect(producer).toBeLessThan(effective);
    expect(effective).toBeLessThan(expiration);
    expect(expiration).toBeLessThan(renewal);
    expect(renewal).toBeLessThan(billing);
    expect(billing).toBeLessThan(premium);
    expect(premium).toBeLessThan(commission);
    expect(commission).toBeLessThan(termControl);
  });

  it("renders the same column slots on DP and non-DP policies", () => {
    const shared = [
      ">Insured<",
      ">Carrier<",
      ">Policy number<",
      ">Form<",
      ">Insured location<",
      ">Insurance type<",
      ">Selling agency<",
      'data-ff-policy-inline="producer"',
      ">Effective date<",
      ">Expiration date<",
      ">Renewal date<",
      ">Billing<",
      ">Premium<",
      ">Commission %<",
      "data-ff-term-override-control",
    ];
    const dp = renderToStaticMarkup(
      createElement(PolicyInformationCard, {
        policy,
        carrierName: "Universal",
        producerDisplayName: "Maya Chen",
        mailing: {
          address: "88 Owner Ln",
          city: "Palm Bay",
          state: "FL",
          zip: "32907",
        },
      }),
    );
    const other = renderToStaticMarkup(
      createElement(PolicyInformationCard, {
        policy: { ...policy, policySubType: "HO3" },
        carrierName: "Universal",
        producerDisplayName: "Maya Chen",
        mailing: null,
      }),
    );

    const dpAt = orderOf(dp, shared);
    const otherAt = orderOf(other, shared);
    expect(dpAt.every((index) => index >= 0)).toBe(true);
    expect(otherAt.every((index) => index >= 0)).toBe(true);
    expect(dpAt).toEqual([...dpAt].sort((a, b) => a - b));
    expect(otherAt).toEqual([...otherAt].sort((a, b) => a - b));

    expect(dp).toContain("Mailing address (owner)");
    expect(dp).not.toContain("data-ff-policy-mailing-placeholder");
    const mailingAt = dp.indexOf("Mailing address (owner)");
    expect(dp.indexOf(">Insured location<")).toBeLessThan(mailingAt);
    expect(mailingAt).toBeLessThan(dp.indexOf(">Insurance type<"));

    expect(other).not.toContain("Mailing address (owner)");
    const placeholderAt = other.indexOf("data-ff-policy-mailing-placeholder");
    expect(other.indexOf(">Insured location<")).toBeLessThan(placeholderAt);
    expect(placeholderAt).toBeLessThan(other.indexOf(">Insurance type<"));

    const billingAt = other.indexOf(">Billing<");
    const premiumAt = other.indexOf(">Premium<");
    const termAt = other.indexOf("data-ff-term-override-control");
    expect(other.indexOf('data-ff-policy-inline="producer"')).toBeLessThan(billingAt);
    expect(other.indexOf(">Effective date<")).toBeLessThan(premiumAt);
    expect(premiumAt).toBeLessThan(other.indexOf(">Commission %<"));
    expect(other.indexOf(">Commission %<")).toBeLessThan(termAt);
  });
});
