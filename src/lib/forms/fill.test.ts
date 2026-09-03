import { describe, expect, it } from "vitest";
import { FORM_TEMPLATE_SEEDS } from "./catalog";
import { fillFormFromSheet, formCounts } from "./fill";

describe("forms fill", () => {
  it("reads the Quote Sheet record, not a separate blob", () => {
    const template = FORM_TEMPLATE_SEEDS[0];
    const cells = fillFormFromSheet(template.fields, {
      coverage_a: { value: "385000", status: "confirmed", source: "seed" },
      address1: { value: "412 Harbor Isle Dr", status: "confirmed", source: "seed" },
      current_carrier: { value: "Citizens", status: "check", source: "extracted" },
    }, { contactName: "Elena Ruiz" });
    const covA = cells.find((c) => c.key === "coverage_a");
    const carrier = cells.find((c) => c.key === "current_carrier");
    expect(covA?.value).toBe("385000");
    expect(carrier?.status).toBe("check");
    expect(formCounts(cells).confirmed).toBeGreaterThan(0);
  });
});
