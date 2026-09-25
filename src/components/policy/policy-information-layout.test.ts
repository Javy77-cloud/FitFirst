import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PolicyInformationCard } from "@/components/policy/policy-information";
import { LobOverviewSections } from "@/components/policy/lob-overview-sections";
import {
  POLICY_INFO_TRIAL_POLICY_ID,
  policyInformationLayoutName,
  policyInformationSlotOrder,
  policyInformationWideRows,
  type PolicyInfoLayoutName,
  type PolicyInfoSlot,
} from "@/components/policy/policy-information-layout";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const cardSource = readFileSync("src/components/policy/policy-information.tsx", "utf8");
const layoutSource = readFileSync("src/components/policy/policy-information-layout.ts", "utf8");

const SLOT_LABEL: Record<Exclude<PolicyInfoSlot, "termOverride" | "subType">, string> = {
  insured: "Insured",
  carrier: "Carrier",
  policyNumber: "Policy number",
  premises: "Insured location",
  mailing: "Mailing address (owner)",
  insuranceType: "Insurance type",
  sellingAgency: "Selling agency",
  producer: "Producer",
  effective: "Effective date",
  expiration: "Expiration date",
  renewal: "Renewal date",
  billing: "Billing",
  premium: "Premium",
  commission: "Commission %",
};

const basePolicy = {
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

const ownerMailing = {
  address: "88 Owner Ln",
  city: "Palm Bay",
  state: "FL",
  zip: "32907",
};

function fieldLabels(html: string): string[] {
  return [...html.matchAll(/<dt\b[^>]*>([^<]*)<\/dt>/g)].map((match) => match[1]);
}

function expectedLabels(
  layout: PolicyInfoLayoutName,
  options: { includeMailing: boolean },
  subTypeLabel: "Form" | "Subtype",
): string[] {
  return policyInformationSlotOrder(layout, options)
    .filter((slot): slot is Exclude<PolicyInfoSlot, "termOverride"> => slot !== "termOverride")
    .map((slot) => (slot === "subType" ? subTypeLabel : SLOT_LABEL[slot]));
}

function renderCard(
  policy: typeof basePolicy & { formType?: string | null; policyType?: string | null },
  options?: { mailing?: typeof ownerMailing | null },
): string {
  return renderToStaticMarkup(
    createElement(PolicyInformationCard, {
      policy,
      carrierName: "Universal",
      producerDisplayName: "Maya Chen",
      mailing: options?.mailing ?? null,
    }),
  );
}

describe("Policy Information slot order", () => {
  it("names the Javeth trial and keeps every other id on the default layout", () => {
    expect(layoutSource).toMatch(/pending owner approval/);
    expect(policyInformationLayoutName(POLICY_INFO_TRIAL_POLICY_ID)).toBe("trial");
    expect(policyInformationLayoutName("another-health-policy")).toBe("default");
    expect(cardSource).not.toMatch(/data-ff-policy-mailing-placeholder/);
    expect(cardSource).not.toMatch(/data-ff-billing-row-spacer/);
  });

  it("lays out a DP policy with the owner mailing cell and Billing under Producer", () => {
    expect(policyInformationWideRows("default", { includeMailing: true })).toEqual([
      ["insured", "carrier", "policyNumber", "subType"],
      ["premises", "mailing", "insuranceType", "sellingAgency"],
      ["producer", "effective", "expiration", "renewal"],
      ["billing", "premium", "commission"],
      ["termOverride"],
    ]);
  });

  it("lays out a policy with no mailing so dates are not shifted right", () => {
    expect(policyInformationWideRows("default", { includeMailing: false })).toEqual([
      ["insured", "carrier", "policyNumber", "subType"],
      ["premises", "insuranceType", "sellingAgency", "producer"],
      ["effective", "expiration", "renewal", "billing"],
      ["premium", "commission"],
      ["termOverride"],
    ]);
  });

  it("stacks the trial policy with Insurance type under Carrier and dates flush left", () => {
    expect(policyInformationWideRows("trial", { includeMailing: false })).toEqual([
      ["insured", "carrier", "policyNumber", "subType"],
      ["premises", "insuranceType", "sellingAgency", "producer"],
      ["effective", "expiration", "renewal", "billing"],
      ["premium", "commission"],
      ["termOverride"],
    ]);
    const withMailing = policyInformationSlotOrder("trial", { includeMailing: true });
    expect(withMailing.indexOf("premises") + 1).toBe(withMailing.indexOf("insuranceType"));
    expect(withMailing.indexOf("effective")).toBe(withMailing.indexOf("premises") + 4);
    expect(withMailing.indexOf("mailing")).toBeGreaterThan(withMailing.indexOf("renewal"));
  });
});

describe("Policy Information card grid order", () => {
  it("renders a DP policy with mailing in the owner slot and no placeholder", () => {
    const html = renderCard(basePolicy, { mailing: ownerMailing });
    expect(html).toContain('data-ff-policy-info-layout="default"');
    expect(html).not.toContain("data-ff-policy-mailing-placeholder");
    expect(fieldLabels(html)).toEqual(expectedLabels("default", { includeMailing: true }, "Form"));
    expect(html).toContain("data-ff-term-override-control");
    const labels = fieldLabels(html);
    expect(labels.indexOf("Mailing address (owner)")).toBe(labels.indexOf("Insured location") + 1);
    expect(labels.indexOf("Billing")).toBe(labels.indexOf("Producer") + 4);
    expect(labels.indexOf("Premium")).toBe(labels.indexOf("Effective date") + 4);
  });

  it("renders an Errors & Omissions policy as E&O without an unknown-type hole", () => {
    const html = renderCard({
      ...basePolicy,
      id: "eo-1",
      policyNumber: "NXTH4RCXPW-00-PL",
      lineOfBusiness: "GL",
      insuranceType: "P&C",
      policySubType: "Errors & Omissions",
      formType: "Errors & Omissions",
    });
    expect(html).toContain("E&amp;O");
    expect(html).not.toContain("Errors &amp; Omissions");
    expect(html).not.toMatch(/unknown type/i);
    const overview = renderToStaticMarkup(
      createElement(LobOverviewSections, {
        input: {
          policyId: "eo-1",
          lineOfBusiness: "GL",
          formType: "Errors & Omissions",
          policySubType: "Errors & Omissions",
          coverageLimits: { eachOccurrence: "1000000", deductible: "2500" },
        },
      }),
    );
    expect(overview).toContain("E&amp;O");
    expect(overview).toContain("Limits");
    expect(overview).toContain("Deductible");
    expect(overview).not.toContain("Payroll");
    expect(overview).not.toContain("Class codes");
    expect(overview).not.toMatch(/unknown type/i);
  });

  it("renders a non-DP P&C policy with no placeholder gap before the dates", () => {
    const html = renderCard({ ...basePolicy, id: "ho3-1", policySubType: "HO3", insuranceType: "P&C" });
    expect(html).toContain('data-ff-policy-info-layout="default"');
    expect(html).not.toContain("data-ff-policy-mailing-placeholder");
    expect(html).not.toContain("Mailing address (owner)");
    expect(fieldLabels(html)).toEqual(expectedLabels("default", { includeMailing: false }, "Form"));
    const labels = fieldLabels(html);
    expect(labels.indexOf("Insurance type")).toBe(labels.indexOf("Carrier") + 4);
    expect(labels.indexOf("Effective date")).toBe(labels.indexOf("Insured location") + 4);
    expect(labels.indexOf("Billing")).toBe(labels.indexOf("Producer") + 4);
    expect(labels.indexOf("Premium")).toBe(labels.indexOf("Effective date") + 4);
  });

  it("renders a generic Health policy with no placeholder gap", () => {
    const html = renderCard({
      ...basePolicy,
      id: "health-generic",
      policyNumber: "SH-100",
      lineOfBusiness: "HEALTH",
      insuranceType: "Health",
      policySubType: "Supplemental Health",
    });
    expect(html).toContain('data-ff-policy-info-layout="default"');
    expect(html).not.toContain("data-ff-policy-mailing-placeholder");
    expect(html).not.toContain("Mailing address (owner)");
    expect(fieldLabels(html)).toEqual(
      expectedLabels("default", { includeMailing: false }, "Subtype"),
    );
    const labels = fieldLabels(html);
    expect(labels[labels.indexOf("Insured location") + 1]).toBe("Insurance type");
    expect(labels.indexOf("Effective date")).toBeLessThan(labels.indexOf("Expiration date"));
    expect(labels.indexOf("Expiration date")).toBeLessThan(labels.indexOf("Renewal date"));
  });

  it("renders Javeth's policy on the trial layout", () => {
    const html = renderCard({
      ...basePolicy,
      id: POLICY_INFO_TRIAL_POLICY_ID,
      policyNumber: "SH-JAVETH",
      lineOfBusiness: "HEALTH",
      insuranceType: "Health",
      policySubType: "Supplemental Health",
    });
    expect(html).toContain('data-ff-policy-info-layout="trial"');
    expect(html).not.toContain("data-ff-policy-mailing-placeholder");
    expect(html).not.toContain("Mailing address (owner)");
    const labels = fieldLabels(html);
    expect(labels).toEqual(expectedLabels("trial", { includeMailing: false }, "Subtype"));
    expect(labels.indexOf("Insurance type")).toBe(labels.indexOf("Carrier") + 4);
    expect(labels.indexOf("Selling agency")).toBe(labels.indexOf("Policy number") + 4);
    expect(labels.indexOf("Producer")).toBe(labels.indexOf("Subtype") + 4);
    expect(labels.indexOf("Effective date")).toBe(labels.indexOf("Producer") + 1);
    expect(labels.indexOf("Billing")).toBe(labels.indexOf("Producer") + 4);
    expect(labels.indexOf("Premium")).toBe(labels.indexOf("Effective date") + 4);
  });
});
