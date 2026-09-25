import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tagsWithTermRole } from "@/lib/documents/document-labels";
import { FILL_DEC_CURRENT_NOTICE } from "@/lib/policy/fill-from-dec";
import { planCurrentDecRoleUpdates } from "@/lib/policy/mark-dec-current";

describe("planCurrentDecRoleUpdates", () => {
  it("marks the chosen declaration current and demotes the previous current", () => {
    const updates = planCurrentDecRoleUpdates(
      [
        { id: "old", tags: tagsWithTermRole(["dec"], "current") },
        { id: "new", tags: ["dec", "mint"] },
        { id: "prior", tags: tagsWithTermRole(["dec"], "prior") },
      ],
      "new",
    );
    expect(updates).toEqual([
      { id: "old", tags: tagsWithTermRole(["dec"], "prior") },
      { id: "new", tags: tagsWithTermRole(["dec", "mint"], "current") },
    ]);
  });

  it("leaves an already-current declaration unchanged", () => {
    expect(
      planCurrentDecRoleUpdates([{ id: "dec", tags: tagsWithTermRole(["policy_dec"], "current") }], "dec"),
    ).toEqual([]);
  });
});

describe("current declaration wiring", () => {
  it("sets current on issue and API attach with no toast, and notices after a manual fill", () => {
    const fill = readFileSync("src/app/actions/policy-fill-from-dec.ts", "utf8");
    const onIssue = fill.slice(fill.indexOf("export async function fillPolicyFromDecOnIssue"));
    expect(onIssue.indexOf("promoteArrivingCurrentDec")).toBeGreaterThan(-1);
    expect(onIssue.indexOf("promoteArrivingCurrentDec")).toBeLessThan(onIssue.indexOf("fillPolicyFromDec({"));
    expect(onIssue).not.toMatch(/flashAction/);
    expect(fill).toMatch(/source === "manual"/);
    expect(fill).toMatch(/promoteArrivingCurrentDec/);

    const declaration = readFileSync("src/app/actions/declaration.ts", "utf8");
    expect(declaration).toMatch(/tagsWithTermRole\(\["dec", "mint", "source:carrier"\], "current"\)/);
    expect(declaration).toMatch(/promoteSoleDealPolicyDeclaration/);
    expect(declaration).not.toMatch(/flashAction/);

    const button = readFileSync("src/components/policy/fill-policy-from-dec-button.tsx", "utf8");
    expect(FILL_DEC_CURRENT_NOTICE).toBe(
      "This declaration page is set as the current policy. Change term role if this isn't right.",
    );
    expect(button).toMatch(/flashAction\(FILL_DEC_CURRENT_NOTICE\)/);
    expect(button).not.toMatch(/flashAction\(FILL_DEC_CURRENT_NOTICE, "error"\)/);

    const table = readFileSync("src/components/policy/tabs/documents-table.tsx", "utf8");
    expect(table).toMatch(/if \(!result\.ok\) \{\s*flashAction\(result\.error, "error"\)/);
    expect(table).not.toMatch(/No DEC extract or proposed term/);

    const apply = readFileSync("src/lib/policy/advance-current-term-apply.ts", "utf8");
    expect(apply).toMatch(/return unresolvedAdvanceResult\(input\.trigger, resolved\.reason\)/);
    expect(apply).toMatch(/error: "Policy not found\."/);
    const inline = readFileSync("src/app/actions/documents.ts", "utf8");
    expect(inline).toMatch(/if \(!promoted\.ok\) \{\s*return \{ ok: false, error: promoted\.error \}/);
  });
});
