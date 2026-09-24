import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { migrateBusinessPhoneOppositeColumn } from "@/lib/custom-fields/store";
import type { FieldLayout } from "@/lib/custom-fields/types";
import {
  migrateBusinessDetailsParity,
  needsBusinessDetailsParityUpgrade,
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
  { key: "dba", label: "DBA", type: "single_line" as const },
  { key: "legal_name", label: "Legal Name", type: "single_line" as const },
  { key: "ein", label: "EIN", type: "single_line" as const },
  { key: "entity_type", label: "Entity Type", type: "picklist" as const, options: [] },
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
  it("default layout groups Business Info / Location / Contact / Operations at density 4", () => {
    const layout = defaultLayoutForModule("businesses");
    const sections = layout.columns.flatMap((column) => column.sections);
    const byId = Object.fromEntries(sections.map((section) => [section.id, section]));
    expect(byId.business?.label).toBe("Business Info");
    expect(byId.business?.density).toBe(4);
    expect(byId.location?.label).toBe("Location");
    expect(byId.location?.density).toBe(4);
    expect(byId.contact?.label).toBe("Business Contact");
    expect(byId.contact?.density).toBe(4);
    expect(byId.operations?.label).toBe("Operations");
    expect(byId.operations?.density).toBe(4);
    expect(byId.intake?.density).toBe(4);
    expect(byId.crm_notes?.density).toBe(4);
    const left = new Set(layout.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(layout.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(right.has("phone")).toBe(true);
    expect(left.has("phone")).toBe(false);
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
    expect(html).toMatch(/data-ff-section-density="4"/);
    expect(html).toMatch(/data-ff-contact-field="business_name"/);
    expect(html).toMatch(/data-ff-contact-label-orientation="above"/);
    expect(html).not.toMatch(/data-ff-contact-label-orientation="beside"/);
    // Quiet left section titles (contact tone), not centered lg default.
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
