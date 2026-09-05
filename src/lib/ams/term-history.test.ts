import { describe, expect, it } from "vitest";
import { priorTerms, sortPolicyTerms, termRoleLabel } from "./term-history";

describe("policy term history", () => {
  it("lists prior then current then proposed without rewriting compare", () => {
    const rows = sortPolicyTerms([
      {
        id: "proposed",
        role: "proposed",
        termEffective: "2026-10-01",
        termExpiration: "2027-10-01",
        premium: "2547.00",
      },
      {
        id: "prior",
        role: "prior",
        termEffective: "2024-10-01",
        termExpiration: "2025-10-01",
        premium: "2010.00",
      },
      {
        id: "current",
        role: "current",
        termEffective: "2025-10-01",
        termExpiration: "2026-10-01",
        premium: "2184.00",
      },
    ]);
    expect(rows.map((row) => row.role)).toEqual(["prior", "current", "proposed"]);
    expect(priorTerms(rows)).toHaveLength(1);
    expect(termRoleLabel("prior")).toBe("Prior term");
  });
});
