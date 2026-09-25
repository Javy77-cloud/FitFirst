import { describe, expect, it } from "vitest";
import { defaultGlobalLists, listsForFamily } from "./global-lists";

describe("global lists", () => {
  it("seeds Zoho-style policy types, sub-types, and terms", () => {
    const rows = defaultGlobalLists();
    expect(rows.some((row) => row.listKey === "policy_sub_type" && row.label === "HO3")).toBe(true);
    expect(
      rows.some(
        (row) =>
          row.listKey === "policy_sub_type" &&
          row.label === "Errors & Omissions" &&
          row.slug === "errors-and-omissions",
      ),
    ).toBe(true);
    expect(rows.some((row) => row.listKey === "policy_sub_type" && row.label === "Term Life")).toBe(true);
    expect(rows.some((row) => row.listKey === "policy_term" && row.family === "P&C" && row.label === "12 Months")).toBe(
      true,
    );
    expect(rows.some((row) => row.listKey === "document_category" && row.slug === "policy_dec")).toBe(true);
  });

  it("scopes sub-types by insurance family", () => {
    const rows = defaultGlobalLists().map((row) => ({ ...row, active: true }));
    const life = listsForFamily(rows, "policy_sub_type", "Life").map((row) => row.label);
    expect(life).toContain("Term Life");
    expect(life).not.toContain("HO3");
  });
});
