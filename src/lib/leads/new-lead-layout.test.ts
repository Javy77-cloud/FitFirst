import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("New Lead uses the live Lead Edit Layout", () => {
  it("renders RecordLayoutFields and drops the old LeadFormFields card", () => {
    const page = readFileSync("src/app/leads/new/page.tsx", "utf8");
    expect(page).toMatch(/RecordLayoutFields/);
    expect(page).toMatch(/LinkExistingContactGuard/);
    expect(page).toMatch(/loadModuleLayoutBundle\("leads"/);
    expect(page).toMatch(/data-ff="new-lead-layout"|data-ff=\{'new-lead-layout'\}/);
    expect(page).toMatch(/Save Lead/);
    expect(page).toMatch(/EditLayoutLink/);
    expect(page).not.toMatch(/LeadFormFields/);
    expect(page).not.toMatch(/max-w-xl/);
  });
});
