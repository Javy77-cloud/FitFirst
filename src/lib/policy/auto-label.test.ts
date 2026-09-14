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
