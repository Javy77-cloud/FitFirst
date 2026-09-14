import { describe, expect, it } from "vitest";
import {
  isOccupationPicklistName,
  OCCUPATION_PICKLIST_NAME,
  OCCUPATION_PICKLIST_SEED,
} from "./occupation-picklist";

describe("occupation picklist wiring", () => {
  it("names the shared Occupations list", () => {
    expect(OCCUPATION_PICKLIST_NAME).toBe("Occupations");
    expect(isOccupationPicklistName("Occupations")).toBe(true);
    expect(isOccupationPicklistName("occupations")).toBe(true);
    expect(isOccupationPicklistName("Jobs")).toBe(false);
  });

  it("seed is non-empty and used only for list bootstrap", () => {
    expect(OCCUPATION_PICKLIST_SEED.length).toBeGreaterThan(5);
    expect(OCCUPATION_PICKLIST_SEED).toContain("Professional");
  });
});
