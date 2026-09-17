import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTACT_EDUCATION_OPTIONS,
  educationOptionsIncludeAssociate,
  insertAssociatesEducationOption,
} from "./contact-field-catalog";

describe("Contact Education Level Associate's", () => {
  it("places Associate's before Bachelor's in the catalog", () => {
    expect([...CONTACT_EDUCATION_OPTIONS]).toEqual([
      "High School",
      "Some College",
      "Associate's",
      "Bachelor's",
      "Master's",
      "Doctorate",
      "Other",
    ]);
  });

  it("inserts Associate's before Bachelor's without wiping custom values", () => {
    const existing = ["High School", "Trade school", "Bachelor's", "Other"] as const;
    expect(insertAssociatesEducationOption(existing)).toEqual([
      "High School",
      "Trade school",
      "Associate's",
      "Bachelor's",
      "Other",
    ]);
    expect(educationOptionsIncludeAssociate(["Associate"])).toBe(true);
    expect(insertAssociatesEducationOption(["Some College", "Associate", "Master's"])).toEqual([
      "Some College",
      "Associate",
      "Master's",
    ]);
    const rich = [{ value: "Some College", color: "teal" as const }, { value: "Bachelor's" }];
    expect(insertAssociatesEducationOption(rich)).toEqual([
      { value: "Some College", color: "teal" },
      { value: "Associate's" },
      { value: "Bachelor's" },
    ]);
  });

  it("seeds and upserts Associate's from the catalog without replacing agency lists", () => {
    const starter = readFileSync("src/lib/custom-fields/starter-picklists.ts", "utf8");
    const store = readFileSync("src/lib/custom-fields/picklist-store.ts", "utf8");
    expect(starter).toMatch(/STARTER_PICKLIST_SEED_KEY\.education/);
    expect(starter).toMatch(/CONTACT_EDUCATION_OPTIONS/);
    expect(store).toMatch(/insertAssociatesEducationOption/);
    expect(store).toMatch(/STARTER_PICKLIST_SEED_KEY\.education/);
    expect(store).toMatch(/Never overwrites a list that already has values/);
  });
});
