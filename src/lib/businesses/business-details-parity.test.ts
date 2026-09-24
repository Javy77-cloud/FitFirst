import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { isWideLayoutField } from "@/lib/custom-fields/section-density";
import { migrateBusinessPhoneOppositeColumn } from "@/lib/custom-fields/store";
import type { FieldLayout } from "@/lib/custom-fields/types";
import {
  migrateBusinessDetailsParity,
  migrateBusinessDetailsRowMap,
  needsBusinessDetailsParityUpgrade,
  needsBusinessDetailsRowMap,
} from "./business-detail-layout";

function twoCol(
  left: { id: string; label: string; fieldKeys: string[]; density?: 1 | 2 | 3 | 4 | 5 }[],
  right: { id: string; label: string; fieldKeys: string[]; density?: 1 | 2 | 3 | 4 | 5 }[],
): FieldLayout {
  return {
    columns: [
      { id: "left", sections: left },
      { id: "right", sections: right },
    ],
  };
}

const BUSINESS_FIELDS = [
  { key: "business_name", label: "Business Name", type: "single_line" as const },
  { key: "primary_contact", label: "Primary Contact", type: "lookup" as const, lookupModule: "contacts" },
  { key: "dba", label: "DBA", type: "single_line" as const },
  { key: "legal_name", label: "Legal Name", type: "single_line" as const },
  { key: "ein", label: "FEIN", type: "single_line" as const },
  { key: "entity_type", label: "Business Type", type: "picklist" as const, options: [] },
  { key: "industry", label: "Industry", type: "picklist" as const, options: [] },
  { key: "mailing_address", label: "Address", type: "address" as const },
  { key: "city", label: "City", type: "single_line" as const },
  { key: "state", label: "State", type: "single_line" as const },
  { key: "zip", label: "ZIP", type: "single_line" as const },
  { key: "phone", label: "Phone", type: "phone" as const },
  { key: "email", label: "Email", type: "email" as const },
  { key: "website", label: "Website", type: "single_line" as const },
  { key: "source", label: "Source", type: "picklist" as const, options: [] },
  { key: "referral", label: "Referral", type: "single_line" as const },
  { key: "employee_count", label: "Employees", type: "number" as const },
  { key: "annual_sales", label: "Annual Sales", type: "currency" as const },
  { key: "payroll_w2", label: "Payroll W2", type: "currency" as const },
  { key: "payroll_1099", label: "Payroll 1099", type: "currency" as const },
  { key: "years_in_business", label: "Years in Business", type: "number" as const },
  { key: "naics", label: "NAICS", type: "single_line" as const },
  { key: "operations", label: "Operations", type: "multi_line" as const },
  { key: "life_notes", label: "Life Notes", type: "multi_line" as const },
  { key: "health_notes", label: "Health Notes", type: "multi_line" as const },
  { key: "pc_notes", label: "P&C Notes", type: "multi_line" as const },
  { key: "notes", label: "Notes", type: "multi_line" as const },
];

describe("business details party parity", () => {
  it("default layout is left Business Info/Location/Contact + right Operations", () => {
    const layout = defaultLayoutForModule("businesses");
    const left = layout.columns[0].sections;
    const right = layout.columns[1].sections;
    expect(left.map((s) => s.id)).toEqual(["business", "location", "contact"]);
    expect(right.map((s) => s.id)).toEqual(["operations", "crm_notes"]);

    const byId = Object.fromEntries(
      [...left, ...right].map((section) => [section.id, section]),
    );
    expect(byId.business?.label).toBe("Business Info");
    expect(byId.business?.density).toBe(2);
    expect(byId.business?.fieldKeys).toEqual([
      "business_name",
      "primary_contact",
      "dba",
      "ein",
      "entity_type",
      "industry",
    ]);
    expect(byId.business?.fieldKeys).not.toContain("legal_name");

    expect(byId.location?.label).toBe("Location");
    expect(byId.contact?.label).toBe("Business Contact");
    expect(byId.contact?.density).toBe(2);
    expect(byId.contact?.fieldKeys).toEqual([
      "phone",
      "email",
      "website",
      "source",
      "referral",
    ]);

    expect(byId.operations?.label).toBe("Operations");
    expect(byId.operations?.fieldKeys[0]).toBe("legal_name");
    expect(byId.crm_notes?.density).toBe(4);

    expect(isWideLayoutField("website", { type: "single_line" }, { contactDesk: true })).toBe(
      true,
    );
  });

  it("stock ein label is FEIN and primary_contact is a contacts lookup", () => {
    const fields = defaultFieldsForModule("businesses");
    expect(fields.find((f) => f.key === "ein")?.label).toBe("FEIN");
    const primary = fields.find((f) => f.key === "primary_contact");
    expect(primary?.label).toBe("Primary Contact");
    expect(primary?.type).toBe("lookup");
    expect(primary?.lookupModule).toBe("contacts");
  });

  it("renders Accounts Details with Contact-matching label-above desk chrome", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "businesses",
        layout: defaultLayoutForModule("businesses"),
        fields: BUSINESS_FIELDS,
        values: { business_name: "Harbor Key LLC", email: "ops@harbor.key" },
      }),
    );
    expect(html).toMatch(/data-ff-record-layout="businesses"/);
    expect(html).toMatch(/data-ff-contact-section="business"/);
    expect(html).toMatch(/data-ff-contact-section="operations"/);
    expect(html).toMatch(/data-ff-contact-section="location"/);
    expect(html).toMatch(/data-ff-contact-section="contact"/);
    expect(html).toMatch(/Business Info/);
    expect(html).toMatch(/Operations/);
    expect(html).toMatch(/data-ff-contact-desk="1"/);
    expect(html).toMatch(/data-ff-section-density="2"/);
    expect(html).toMatch(/data-ff-contact-field="business_name"/);
    expect(html).toMatch(/data-ff-contact-field="primary_contact"/);
    expect(html).toMatch(/data-ff-contact-label-orientation="above"/);
    expect(html).not.toMatch(/data-ff-contact-label-orientation="beside"/);
    expect(html).toMatch(/text-sm font-semibold leading-snug text-\[#002868\]/);
    expect(html).not.toMatch(/text-center text-lg font-semibold/);
  });

  it("does not apply party desk chrome to Deal Details (email stays wide path)", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout: {
          columns: [
            {
              id: "left",
              sections: [
                {
                  id: "contact",
                  label: "Contact",
                  fieldKeys: ["email", "phone"],
                  density: 4,
                },
              ],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "phone" },
        ],
        values: {},
      }),
    );
    expect(html).not.toMatch(/data-ff-contact-desk="1"/);
    expect(html).not.toMatch(/data-ff-contact-label-orientation="above"/);
    expect(html).toMatch(/data-ff-field-span="full"/);
  });

  it("migrates pre-parity agency labels + missing density without restoring CRM Notes", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Account",
          fieldKeys: ["business_name", "dba", "legal_name", "ein"],
        },
        { id: "location", label: "Location", fieldKeys: ["mailing_address", "city", "state", "zip"] },
      ],
      [
        { id: "contact", label: "Contact", fieldKeys: ["phone", "email", "website"] },
        {
          id: "operations",
          label: "Operations",
          fieldKeys: ["employee_count", "notes", "operations"],
        },
      ],
    );
    expect(needsBusinessDetailsParityUpgrade(agency)).toBe(true);
    expect(agency.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");

    const next = migrateBusinessDetailsParity(agency);
    const byId = Object.fromEntries(
      next.columns.flatMap((c) => c.sections).map((s) => [s.id, s]),
    );
    expect(byId.business?.label).toBe("Business Info");
    expect(byId.contact?.label).toBe("Business Contact");
    expect(byId.business?.density).toBe(4);
    expect(byId.operations?.density).toBe(4);
    expect(next.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");
    expect(needsBusinessDetailsParityUpgrade(next)).toBe(false);
  });

  it("row-map migrate reorders Business Info and merges contact under Location; Operations stays right", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Business Info",
          fieldKeys: ["business_name", "dba", "legal_name", "ein", "entity_type", "industry", "agency_custom"],
          density: 4,
        },
        { id: "location", label: "Location", fieldKeys: ["mailing_address", "city", "state", "zip"], density: 4 },
      ],
      [
        { id: "contact", label: "Business Contact", fieldKeys: ["phone", "email", "website"], density: 4 },
        { id: "intake", label: "Intake", fieldKeys: ["source", "referral"], density: 4 },
        {
          id: "operations",
          label: "Operations",
          fieldKeys: ["employee_count", "annual_sales", "operations"],
          density: 4,
        },
      ],
    );
    expect(needsBusinessDetailsRowMap(agency)).toBe(true);

    const next = migrateBusinessDetailsRowMap(agency);
    expect(needsBusinessDetailsRowMap(next)).toBe(false);

    const left = next.columns[0].sections;
    const right = next.columns[1].sections;
    expect(left.map((s) => s.id)).toEqual(["business", "location", "contact"]);
    expect(right.map((s) => s.id)).toContain("operations");
    expect(left.map((s) => s.id)).not.toContain("operations");

    const business = left.find((s) => s.id === "business")!;
    expect(business.density).toBe(2);
    expect(business.fieldKeys.slice(0, 6)).toEqual([
      "business_name",
      "primary_contact",
      "dba",
      "ein",
      "entity_type",
      "industry",
    ]);
    expect(business.fieldKeys).toContain("agency_custom");
    expect(business.fieldKeys).not.toContain("legal_name");

    const contact = left.find((s) => s.id === "contact")!;
    expect(contact.density).toBe(2);
    expect(contact.fieldKeys.slice(0, 5)).toEqual([
      "phone",
      "email",
      "website",
      "source",
      "referral",
    ]);

    const operations = right.find((s) => s.id === "operations")!;
    expect(operations.fieldKeys[0]).toBe("legal_name");
    expect(operations.fieldKeys).toContain("employee_count");
    expect(next.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("intake");
    expect(next.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");
  });

  it("row-map detects agency Primary Contact by label and keeps that key", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Business Info",
          fieldKeys: ["business_name", "dba", "ein", "entity_type", "industry", "cf_primary"],
          density: 4,
        },
        { id: "location", label: "Location", fieldKeys: ["mailing_address"], density: 4 },
        {
          id: "contact",
          label: "Business Contact",
          fieldKeys: ["phone", "email", "website", "source", "referral"],
          density: 4,
        },
      ],
      [{ id: "operations", label: "Operations", fieldKeys: ["employee_count"], density: 4 }],
    );
    const hints = [{ key: "cf_primary", label: "Primary Contact" }];
    expect(needsBusinessDetailsRowMap(agency, hints)).toBe(true);
    const next = migrateBusinessDetailsRowMap(agency, hints);
    const business = next.columns[0].sections.find((s) => s.id === "business")!;
    expect(business.fieldKeys.slice(0, 2)).toEqual(["business_name", "cf_primary"]);
    expect(business.fieldKeys).not.toContain("primary_contact");
    expect(needsBusinessDetailsRowMap(next, hints)).toBe(false);
  });

  it("phone migrate still composes with parity migrate", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Account",
          fieldKeys: ["business_name", "dba", "phone", "email", "website"],
        },
      ],
      [{ id: "operations", label: "Operations", fieldKeys: ["employee_count"] }],
    );
    const withPhone = migrateBusinessPhoneOppositeColumn(agency);
    const next = migrateBusinessDetailsParity(withPhone);
    const left = new Set(next.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(next.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(left.has("phone")).toBe(false);
    expect(right.has("phone")).toBe(true);
    expect(
      next.columns.flatMap((c) => c.sections).find((s) => s.id === "business")?.label,
    ).toBe("Business Info");
  });
});
