import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultFieldsForModule, defaultLayoutForModule } from "./modules";
import { CORE_FIELDS, defaultLayoutForLine } from "./defaults";
import {
  APPLICANT_CRM_FIELDS,
  APPLICANT_CUSTOM_KEYS,
  APPLICANT_SECTION_FIELD_KEYS,
} from "./applicant-fields";
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
} from "@/lib/quote-sheet/applicant-core";
import { LEAD_TO_DEAL_CUSTOM_KEYS } from "./transfer";
import { allLayoutFieldKeys } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7jt Lead rail + shared applicant fields", () => {
  it("Lead desk is layout | narrow docs | ~320px RecordContextRail", () => {
    const desk = source("src/components/leads/lead-detail-workspace.tsx");
    const page = source("src/app/leads/[id]/page.tsx");
    expect(desk).toMatch(/data-ff-lead-layout="layout-docs-rail"/);
    expect(desk).toMatch(/grid-cols-\[minmax\(0,1\.4fr\)_minmax\(0,0\.7fr\)_minmax\(280px,320px\)\]/);
    expect(desk).toMatch(/data-ff-lead-context-rail/);
    expect(page).toMatch(/loadRecordContext\(\{/);
    expect(page).toMatch(/rail=\{<RecordContextRail context=\{context\} \/>\}/);
    expect(source("src/lib/record-context.ts")).toMatch(/if \(scope\.leadId\)/);
  });

  it("reuses applicant_core picklist options on Lead and Deal — never free-text duplicates", () => {
    const leadByKey = Object.fromEntries(defaultFieldsForModule("leads").map((f) => [f.key, f]));
    const dealByKey = Object.fromEntries(CORE_FIELDS.map((f) => [f.key, f]));
    for (const field of APPLICANT_CRM_FIELDS) {
      expect(leadByKey[field.key]?.type).toBe("picklist");
      expect(dealByKey[field.key]?.type).toBe("picklist");
      expect(leadByKey[field.key]?.options).toEqual(field.options);
      expect(dealByKey[field.key]?.options).toEqual(field.options);
      expect(leadByKey[field.key]?.label).toBe(field.label);
    }
    expect(leadByKey.applicant_gender?.options).toEqual([...GENDER_OPTIONS]);
    expect(leadByKey.applicant_marital_status?.options).toEqual([...MARITAL_STATUS_OPTIONS]);
    expect(leadByKey.applicant_employment?.options).toEqual([...EMPLOYMENT_STATUS_OPTIONS]);
    expect(leadByKey.applicant_occupation?.options).toEqual([...OCCUPATION_OPTIONS]);
    expect(leadByKey.applicant_education_level?.options).toEqual([...EDUCATION_LEVEL_OPTIONS]);
    expect(leadByKey.entity_type?.options).toEqual([...ENTITY_TYPE_OPTIONS]);
    // occupation sits immediately under employment in shared defs
    const keys = APPLICANT_CRM_FIELDS.map((f) => f.key);
    expect(keys.indexOf("applicant_occupation")).toBe(keys.indexOf("applicant_employment") + 1);
  });

  it("puts Applicant section after Contact on Lead and Deal essential layouts", () => {
    const lead = defaultLayoutForModule("leads");
    const leadLeft = lead.columns[0].sections.map((s) => s.id);
    expect(leadLeft).toEqual(
      expect.arrayContaining(["contact", "applicant", "insured_address", "mailing_address"]),
    );
    expect(leadLeft.indexOf("applicant")).toBe(leadLeft.indexOf("contact") + 1);
    const applicant = lead.columns[0].sections.find((s) => s.id === "applicant");
    expect(applicant?.fieldKeys).toEqual([...APPLICANT_SECTION_FIELD_KEYS]);
    expect(lead.columns[0].sections.find((s) => s.id === "contact")?.fieldKeys).not.toContain(
      "date_of_birth",
    );

    const deal = defaultLayoutForLine("HO");
    expect(deal.columns[0].sections.map((s) => s.id)).toEqual(["contact", "applicant"]);
    expect(deal.columns[1].sections.map((s) => s.id)).toEqual(["insured_address", "mailing_address"]);
    expect(deal.columns[0].sections.find((s) => s.id === "applicant")?.fieldKeys).toEqual([
      ...APPLICANT_SECTION_FIELD_KEYS,
    ]);
    expect(allLayoutFieldKeys(deal)).toEqual(
      expect.arrayContaining([...APPLICANT_CUSTOM_KEYS, "date_of_birth", "contact_mailing_address"]),
    );
  });

  it("maps applicant custom keys Lead → Deal and upgrades catalogs without wipe", () => {
    for (const key of APPLICANT_CUSTOM_KEYS) {
      expect(LEAD_TO_DEAL_CUSTOM_KEYS).toContain(key);
    }
    const store = source("src/lib/custom-fields/store.ts");
    expect(store).toMatch(/APPLICANT_CUSTOM_KEYS/);
    expect(store).toMatch(/ensureLeadCatalogUpgrades/);
    expect(store).toMatch(/ensureDealCoreLabelUpgrades/);
    expect(source("src/lib/custom-fields/applicant-fields.ts")).toMatch(
      /from "@\/lib\/quote-sheet\/applicant-core"/,
    );
  });
});
