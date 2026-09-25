import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_LABEL_TEMPLATE,
  buildPolicyLabel,
  normalizePolicyLabelTemplate,
  policyLabelPreviewSample,
} from "./auto-label";

describe("policy auto-label", () => {
  it("joins fields with separator and skips empties", () => {
    const label = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Elena Hale",
      carrier: "",
      policyType: "HO3",
      policyNumber: "HP-FL-88421",
    });
    expect(label).toBe("Elena Hale / HO3 / HP-FL-88421");
    expect(label).not.toContain("//");
    expect(label).not.toMatch(/\/\s*\//);
  });

  it("shows the form code in the policy name when Home is only the line", () => {
    const label = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Claudia Gaviria Edison",
      carrier: "Notary",
      policyType: "Home",
      formType: "HO3",
      policySubType: "HO6 ( Condo)",
      policyNumber: "203",
    });
    expect(label).toBe("Claudia Gaviria Edison / Notary / HO3 / 203");
    expect(label).not.toContain("Home");

    const fromSubtype = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Claudia Gaviria Edison",
      carrier: "Notary",
      policyType: "Home",
      policySubType: "HO6 ( Condo)",
      policyNumber: "203",
    });
    expect(fromSubtype).toBe("Claudia Gaviria Edison / Notary / HO6 / 203");

    const fallback = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Claudia Gaviria Edison",
      carrier: "Notary",
      policyType: "Home",
      policyNumber: "203",
    });
    expect(fallback).toBe("Claudia Gaviria Edison / Notary / Home / 203");

    const workers = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Northstar",
      carrier: "Pie",
      policyType: "Workers' Comp",
      policyNumber: "WC-1",
    });
    expect(workers).toBe("Northstar / Pie / WC / WC-1");

    const liability = buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {
      ownerName: "Harbor",
      carrier: "Next",
      policyType: "Commercial",
      policySubType: "General Liability",
      policyNumber: "GL-1",
    });
    expect(liability).toBe("Harbor / Next / General Liability / GL-1");
  });

  it("falls back to policy number when everything empty", () => {
    expect(buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, {})).toBe("Policy");
    expect(
      buildPolicyLabel(DEFAULT_POLICY_LABEL_TEMPLATE, { policyNumber: "X-1" }),
    ).toBe("X-1");
  });

  it("normalizes bad templates to defaults", () => {
    expect(normalizePolicyLabelTemplate(null).fields).toEqual(
      DEFAULT_POLICY_LABEL_TEMPLATE.fields,
    );
    expect(normalizePolicyLabelTemplate({ fields: ["nope"], separator: " · " }).fields).toEqual(
      DEFAULT_POLICY_LABEL_TEMPLATE.fields,
    );
    expect(
      normalizePolicyLabelTemplate({ fields: ["ownerName", "ownerName", "carrier"], separator: " · " }),
    ).toEqual({ fields: ["ownerName", "carrier"], separator: " · " });
  });

  it("builds a live preview sample", () => {
    expect(policyLabelPreviewSample(DEFAULT_POLICY_LABEL_TEMPLATE)).toContain("Elena Hale");
  });
});
