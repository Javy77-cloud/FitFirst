import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { readFileSync } from "node:fs";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { emptySheetValues, fieldsForLine } from "./catalog";
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

  it("keeps Home / Auto / Flood product catalogs without Deal Details identity", () => {
    const home = fieldsForLine("home", "homeowners").map((field) => field.key);
    const auto = fieldsForLine("auto").map((field) => field.key);
    const flood = fieldsForLine("flood").map((field) => field.key);
    expect(home).toEqual(expect.arrayContaining(["coverage_a", "year_built", "new_purchase"]));
    expect(home).not.toContain("applicant_name");
    expect(auto).toEqual(expect.arrayContaining(["vin", "driver_1_name", "aaa_member"]));
    expect(auto).not.toContain("applicant_name");
    expect(flood).toEqual(expect.arrayContaining(["flood_zone"]));
    expect(flood).not.toContain("applicant_name");
    expect(fieldsForLine("life").some((field) => field.key === "applicant_name")).toBe(false);
    expect(fieldsForLine("health").some((field) => field.key === "applicant_name")).toBe(false);
    expect(fieldsForLine("health").some((field) => field.key === "medicare_number")).toBe(true);
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

  it("renders the Life Risk Profile lean sections and hides identity / Whole Life term length", () => {
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-life",
        line: "life",
        fields: [],
        values: {
          ...emptySheetValues("life"),
          product_type: { value: "Term", status: "confirmed", source: "agent" },
          tobacco_status: { value: "Never", status: "confirmed", source: "agent" },
          existing_coverage: { value: "no", status: "confirmed", source: "agent" },
        },
        product: "life",
      }),
    );
    expect(html).toContain("Risk Profile");
    expect(html).toContain("Save Risk Profile");
    expect(html).toContain("Fill Risk Profile");
    expect(html).not.toMatch(/Master sheet/i);
    expect(html).toContain("Product type");
    expect(html).toContain("Term length");
    expect(html).toContain("Premium budget");
    expect(html).toContain("Build &amp; tobacco");
    expect(html).toContain("Medical conditions");
    expect(html).toContain("Has existing life coverage?");
    expect(html).toContain("Primary name");
    expect(html).not.toContain("Applicant name");
    expect(html).not.toContain("Date of birth");
    expect(html).toContain('data-ff-sheet-multiselect="medical_conditions"');
    expect(html).toMatch(/data-ff-multi-select="medical_conditions"/);
    expect(html).toMatch(/data-ff-multi-searchable="1"/);

    const whole = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-life",
        line: "life",
        fields: [],
        values: {
          ...emptySheetValues("life"),
          product_type: { value: "Whole Life", status: "confirmed", source: "agent" },
          tobacco_status: { value: "Current", status: "confirmed", source: "agent" },
          existing_coverage: { value: "yes", status: "confirmed", source: "agent" },
        },
        product: "life",
      }),
    );
    expect(whole).not.toContain("Term length");
    expect(whole).toContain("Tobacco type");
    expect(whole).toContain("Last tobacco date");
    expect(whole).toContain("Current company");
    expect(whole).toContain("Existing face amount");
  });

  it("renders the Health Risk Profile lean sections and hides Medicare off Marketplace", () => {
    const marketplace = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-health",
        line: "health",
        fields: [],
        values: {
          ...emptySheetValues("health"),
          plan_type: { value: "Marketplace", status: "confirmed", source: "agent" },
          tobacco_status: { value: "Never", status: "confirmed", source: "agent" },
          spouse_on_application: { value: "no", status: "confirmed", source: "agent" },
          dependents_under_26: { value: "no", status: "confirmed", source: "agent" },
          pregnancy: { value: "no", status: "confirmed", source: "agent" },
          employer_plan: { value: "no", status: "confirmed", source: "agent" },
          qualifying_life_event: { value: "no", status: "confirmed", source: "agent" },
          existing_coverage: { value: "no", status: "confirmed", source: "agent" },
        },
        product: "health",
      }),
    );
    expect(marketplace).toContain("Risk Profile");
    expect(marketplace).toContain("Coverage type");
    expect(marketplace).toContain("Metal level preference");
    expect(marketplace).toContain("Deductible preference");
    expect(marketplace).toContain("Household size");
    expect(marketplace).toContain("Tobacco use");
    expect(marketplace).toContain("Medical conditions");
    expect(marketplace).toContain("Current employer plan");
    expect(marketplace).toContain("Has current health coverage?");
    expect(marketplace).not.toContain("Applicant name");
    expect(marketplace).not.toContain("Medicare number");
    expect(marketplace).not.toContain("Part A start date");
    expect(marketplace).not.toContain('data-ff-sheet-group-header="Medicare"');
    expect(marketplace).not.toContain("Spouse name");
    expect(marketplace).not.toContain("Dependent 1 name");
    expect(marketplace).not.toContain("Pregnancy due date");
    expect(marketplace).not.toContain("Employer plan name");
    expect(marketplace).not.toContain("QLE type");
    expect(marketplace).not.toContain("Current carrier");
    expect(marketplace).not.toContain("Tobacco type");
    expect(marketplace).toContain('data-ff-sheet-multiselect="medical_conditions"');

    const medicare = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-health",
        line: "health",
        fields: [],
        values: {
          ...emptySheetValues("health"),
          plan_type: { value: "Medicare Advantage", status: "confirmed", source: "agent" },
          tobacco_status: { value: "Former", status: "confirmed", source: "agent" },
          spouse_on_application: { value: "yes", status: "confirmed", source: "agent" },
          dependents_under_26: { value: "yes", status: "confirmed", source: "agent" },
          pregnancy: { value: "yes", status: "confirmed", source: "agent" },
          employer_plan: { value: "yes", status: "confirmed", source: "agent" },
          qualifying_life_event: { value: "yes", status: "confirmed", source: "agent" },
          existing_coverage: { value: "yes", status: "confirmed", source: "agent" },
        },
        product: "health",
      }),
    );
    expect(medicare).toContain("Medicare number");
    expect(medicare).toContain("Part A start date");
    expect(medicare).toContain("LIS / Extra Help");
    expect(medicare).toContain('data-ff-sheet-group-header="Medicare"');
    expect(medicare).not.toContain("Metal level preference");
    expect(medicare).toContain("Tobacco type");
    expect(medicare).toContain("Last tobacco date");
    expect(medicare).toContain("Spouse name");
    expect(medicare).toContain("Dependent 1 name");
    expect(medicare).toContain("Pregnancy due date");
    expect(medicare).toContain("Employer plan name");
    expect(medicare).toContain("QLE type");
    expect(medicare).toContain("Current carrier");

    const dental = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-health",
        line: "health",
        fields: [],
        values: {
          ...emptySheetValues("health"),
          plan_type: { value: "Dental", status: "confirmed", source: "agent" },
        },
        product: "health",
      }),
    );
    expect(dental).not.toContain("Medicare number");
    expect(dental).not.toContain("Metal level preference");
    expect(dental).not.toContain('data-ff-sheet-group-header="Medicare"');
  });
});
