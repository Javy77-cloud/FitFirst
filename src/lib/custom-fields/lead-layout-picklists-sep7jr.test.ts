import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultFieldsForModule, defaultLayoutForModule } from "./modules";
import { CORE_FIELDS } from "./defaults";
import {
  LEAD_INSURANCE_DESIRE_OPTIONS,
  LEAD_INSURANCE_SUBTYPE_OPTIONS,
  LEAD_INSURANCE_TYPE_OPTIONS,
  LEAD_LANGUAGE_OPTIONS,
  LEAD_PIPELINE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  pipelineSlugFromLeadPipeline,
} from "./lead-picklist-options";
import { convertFieldCopy } from "@/lib/crm/convert";
import { dealValuesFromLead, LEAD_TO_DEAL_CUSTOM_KEYS } from "./transfer";
import { allLayoutFieldKeys } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7jr Lead layout picklists + convert map", () => {
  it("makes Temperature/Status/Language/Insurance desire picklists — never single_line", () => {
    const byKey = Object.fromEntries(defaultFieldsForModule("leads").map((field) => [field.key, field]));
    for (const key of ["temperature", "status", "preferred_language", "insurance_type_desired", "source"]) {
      expect(byKey[key]?.type).toBe("picklist");
      expect(byKey[key]?.options?.length).toBeGreaterThan(0);
    }
    expect(byKey.temperature?.options).toEqual([...LEAD_TEMPERATURE_OPTIONS]);
    expect(byKey.status?.options).toEqual([...LEAD_STATUS_OPTIONS]);
    expect(byKey.preferred_language?.options).toEqual([...LEAD_LANGUAGE_OPTIONS]);
    expect(byKey.insurance_type_desired?.options).toEqual([...LEAD_INSURANCE_DESIRE_OPTIONS]);
  });

  it("labels Insured Address, adds Mailing Address, Pipeline, Insurance Type, Subtype", () => {
    const byKey = Object.fromEntries(defaultFieldsForModule("leads").map((field) => [field.key, field]));
    expect(byKey.mailing_address?.label).toBe("Insured Address");
    expect(byKey.mailing_address?.systemKey).toBe("mailingAddress");
    expect(byKey.contact_mailing_address?.label).toBe("Mailing Address");
    expect(byKey.contact_mailing_address?.type).toBe("address");
    expect(byKey.pipeline?.type).toBe("picklist");
    expect(byKey.pipeline?.options).toEqual([...LEAD_PIPELINE_OPTIONS]);
    expect(byKey.insurance_type?.options).toEqual([...LEAD_INSURANCE_TYPE_OPTIONS]);
    expect(byKey.insurance_subtype?.options).toEqual([...LEAD_INSURANCE_SUBTYPE_OPTIONS]);

    const dealByKey = Object.fromEntries(CORE_FIELDS.map((field) => [field.key, field]));
    expect(dealByKey.mailing_address?.label).toBe("Insured Address");
    expect(dealByKey.contact_mailing_address?.label).toBe("Mailing Address");
    expect(dealByKey.preferred_language?.type).toBe("picklist");

    const layoutKeys = allLayoutFieldKeys(defaultLayoutForModule("leads"));
    expect(byKey.insurance_subtype?.label).toBe("Policy form");
    expect(byKey.insurance_category?.label).toBe("Insurance type");
    expect(layoutKeys).toEqual(
      expect.arrayContaining([
        "mailing_address",
        "contact_mailing_address",
        "pipeline",
        "insurance_type",
        "insurance_subtype",
        "picklist_yp0c",
        "temperature",
      ]),
    );
    expect(layoutKeys).toContain("status");
    expect(layoutKeys).toContain("cadence");
    expect(layoutKeys).not.toContain("insurance_type_desired");
  });

  it("maps Lead picklists onto Deal field values + native quoting/pipeline on convert", () => {
    expect(pipelineSlugFromLeadPipeline("P&C")).toBe("p-c");
    expect(pipelineSlugFromLeadPipeline("Life")).toBe("life");
    expect(pipelineSlugFromLeadPipeline("Flood")).toBe("p-c");
    expect(pipelineSlugFromLeadPipeline("Flood")).toBe("p-c");
    expect(LEAD_TO_DEAL_CUSTOM_KEYS).toEqual(
      expect.arrayContaining([
        "contact_mailing_address",
        "pipeline",
        "insurance_type",
        "insurance_category",
        "insurance_subtype",
        "picklist_yp0c",
      ]),
    );

    const lead = {
      firstName: "Elena",
      lastName: "Ruiz",
      mailingAddress: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      preferredLanguage: "es",
      temperature: "hot",
      status: "qualified",
      insuranceTypeDesired: "HO",
      notes: "Palm Bay shop",
    };
    const custom = {
      pipeline: "P&C",
      insurance_type: "PC",
      insurance_subtype: "HO3",
      contact_mailing_address: "PO Box 12",
    };
    const copy = convertFieldCopy(lead, "HO", "FL", null, custom);
    expect(copy.pipelineSlug).toBe("p-c");
    expect(copy.quotingForm).toBe("HO3");
    expect(copy.policySubType).toBe("HO3");
    expect(copy.fieldValues.mailing_address).toBe("412 Harbor Isle Dr");
    expect(copy.fieldValues.contact_mailing_address).toBe("PO Box 12");
    expect(copy.fieldValues.pipeline).toBe("P&C");
    expect(copy.fieldValues.preferred_language).toBe("es");
    expect(copy.fieldValues.temperature).toBe("hot");
    expect(copy.notes).toContain("Temperature: hot");

    const values = dealValuesFromLead(lead, CORE_FIELDS, null, custom);
    expect(values.contact_mailing_address).toBe("PO Box 12");
    expect(values.insurance_subtype).toBe("HO3");
    expect(values.picklist_5n3i).toBe("P&C");
    expect(values.picklist).toBe("HO3");
  });

  it("upgrades catalog types in store and stops resurrecting removed Lead layout fields", () => {
    const store = source("src/lib/custom-fields/store.ts");
    expect(store).toMatch(/ensureLeadCatalogUpgrades/);
    expect(store).toMatch(/migrateLeadLayouts/);
    expect(source("src/lib/custom-fields/migrate-lead-layout.ts")).toMatch(/LEAD_LAYOUT_STRIP_KEYS/);
    expect(store).toMatch(/LEAD_CATALOG_UPGRADE_KEYS/);
    expect(store).toMatch(/do not resurrect deleted fields/);
    expect(store).toMatch(/module === "carriers"/);
    expect(source("src/app/actions/crm.ts")).toMatch(/loadRecordValues\(leadId, "leads"\)/);
    expect(source("src/lib/custom-fields/record-system.ts")).toMatch(/insuranceTypeDesired/);
    expect(source("src/lib/custom-fields/record-system.ts")).toMatch(/temperature/);
  });
});
