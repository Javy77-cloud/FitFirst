import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fieldsForLine } from "./catalog";
import { submittedSheetValues } from "./save-values";
import {
  CONFIRM_RISK_PROFILE_LABEL,
  FILL_RISK_PROFILE_LABEL,
  FILLING_RISK_PROFILE_TITLE,
  RISK_PROFILE_LABEL,
  RISK_PROFILE_REVIEWED_LABEL,
  RISK_PROFILE_SAVED_FLASH,
  RISK_PROFILE_SAVED_TOAST,
  SAVE_RISK_PROFILE_LABEL,
} from "./risk-profile-copy";
import { FILL_MASTER_SHEET_LABEL, MASTER_FILL_BUSY_TITLE } from "./master-fill";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const AGENT_VISIBLE_SHEET_SURFACES = [
  "src/components/deal/master-sheet-compare.tsx",
  "src/components/deal/master-sheet-fill-button.tsx",
  "src/components/deal/sheet-approve-gate.tsx",
  "src/components/deal/source-vs-sheet.tsx",
  "src/components/deal/quoting-line-picker.tsx",
  "src/components/deal/documents-panel.tsx",
  "src/components/deal/quote-handoff.tsx",
  "src/components/deal/appetite-capture.tsx",
  "src/lib/quoting/fill-path.ts",
  "src/lib/quoting/ready-to-shop.ts",
  "src/lib/quote-sheet/master-fill.ts",
  "src/lib/quote-sheet/toolbar.ts",
  "src/lib/desk/action-flash.ts",
  "src/lib/flash.ts",
];

describe("Risk Profile agent-visible copy", () => {
  it("uses Risk Profile on the shared Documents / sheet surface", () => {
    expect(RISK_PROFILE_LABEL).toBe("Risk Profile");
    expect(SAVE_RISK_PROFILE_LABEL).toBe("Save Risk Profile");
    expect(FILL_RISK_PROFILE_LABEL).toBe("Fill Risk Profile");
    expect(CONFIRM_RISK_PROFILE_LABEL).toBe("Confirm Risk Profile");
    expect(FILLING_RISK_PROFILE_TITLE).toBe("Filling your Risk Profile…");
    expect(RISK_PROFILE_SAVED_TOAST).toBe("Risk Profile saved.");
    expect(RISK_PROFILE_SAVED_FLASH).toBe("Risk Profile saved");
    expect(RISK_PROFILE_REVIEWED_LABEL).toBe("I visually reviewed this Risk Profile.");
    expect(FILL_MASTER_SHEET_LABEL).toBe(FILL_RISK_PROFILE_LABEL);
    expect(MASTER_FILL_BUSY_TITLE).toBe(FILLING_RISK_PROFILE_TITLE);

    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/RISK_PROFILE_LABEL/);
    expect(sheet).toMatch(/SAVE_RISK_PROFILE_LABEL/);
    expect(sheet).toMatch(/data-ff-risk-profile-form/);

    const gate = source("src/components/deal/sheet-approve-gate.tsx");
    expect(gate).toMatch(/Confirm Risk Profile/);
    expect(gate).toMatch(/I visually reviewed this Risk Profile\./);

    for (const file of AGENT_VISIBLE_SHEET_SURFACES) {
      const text = source(file);
      expect(text).not.toMatch(/Master [Ss]heet/);
      expect(text).not.toMatch(/master sheet/);
    }
  });

  it("keeps Home / Auto / Flood applicant + line catalogs", () => {
    const home = fieldsForLine("home", "homeowners").map((field) => field.key);
    const auto = fieldsForLine("auto").map((field) => field.key);
    const flood = fieldsForLine("flood").map((field) => field.key);
    expect(home).toEqual(expect.arrayContaining(["applicant_name", "coverage_a", "year_built"]));
    expect(auto).toEqual(expect.arrayContaining(["applicant_name", "vin", "driver_1_name"]));
    expect(flood).toEqual(expect.arrayContaining(["applicant_name", "flood_zone"]));
    expect(fieldsForLine("life").some((field) => field.key === "applicant_name")).toBe(false);
  });

  it("joins multi-select checkbox values on save", () => {
    const form = new FormData();
    form.set("dealId", "deal-1");
    form.append("medical_conditions", "");
    form.append("medical_conditions", "Asthma");
    form.append("medical_conditions", "Sleep apnea");
    const submitted = submittedSheetValues(form);
    expect(submitted.dealId).toBeUndefined();
    expect(submitted.medical_conditions).toBe("Asthma, Sleep apnea");
  });
});
