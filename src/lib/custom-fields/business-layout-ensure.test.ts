import { describe, expect, it } from "vitest";
import { defaultLayoutForModule } from "./modules";
import { allLayoutFieldKeys, type FieldLayout } from "./types";
import { migrateBusinessPhoneOppositeColumn } from "./store";

function twoCol(
  left: { id: string; label: string; fieldKeys: string[] }[],
  right: { id: string; label: string; fieldKeys: string[] }[],
): FieldLayout {
  return {
    columns: [
      { id: "left", sections: left },
      { id: "right", sections: right },
    ],
  };
}

describe("business detail layout feel-pass", () => {
  it("default puts business_name and phone in opposite columns", () => {
    const layout = defaultLayoutForModule("businesses");
    const left = new Set(layout.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(layout.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(left.has("phone")).toBe(false);
    expect(right.has("phone")).toBe(true);
    expect(right.has("business_name")).toBe(false);
    const leftCount = left.size;
    const rightCount = right.size;
    expect(Math.abs(leftCount - rightCount)).toBeLessThanOrEqual(4);
  });

  it("migrate moves phone opposite name without restoring deleted CRM Notes", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Business",
          fieldKeys: ["business_name", "dba", "legal_name", "phone", "email", "website", "ein"],
        },
        { id: "location", label: "Location", fieldKeys: ["mailing_address", "city", "state", "zip"] },
      ],
      [
        { id: "intake", label: "Intake", fieldKeys: ["source", "referral"] },
        {
          id: "operations",
          label: "Operations",
          fieldKeys: ["employee_count", "notes", "operations"],
        },
      ],
    );
    // Agency deleted CRM Notes and moved notes into Operations — must stay gone.
    expect(allLayoutFieldKeys(agency)).not.toContain("life_notes");
    expect(agency.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");

    const next = migrateBusinessPhoneOppositeColumn(agency);
    const left = new Set(next.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(next.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(left.has("phone")).toBe(false);
    expect(right.has("phone")).toBe(true);
    expect(right.has("email")).toBe(true);
    expect(right.has("website")).toBe(true);
    expect(next.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");
    expect(allLayoutFieldKeys(next)).not.toContain("life_notes");
    expect(allLayoutFieldKeys(next)).toContain("notes");
    const ops = next.columns[1].sections.find((s) => s.id === "operations");
    expect(ops?.fieldKeys).toContain("notes");
  });


  it("migrate creates right column when agency left everything in one column", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Business",
          fieldKeys: ["business_name", "dba", "phone", "email", "website"],
        },
      ],
      [],
    );
    const next = migrateBusinessPhoneOppositeColumn(agency);
    expect(next.columns.length).toBeGreaterThanOrEqual(2);
    const left = new Set(next.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(next.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(left.has("phone")).toBe(false);
    expect(right.has("phone")).toBe(true);
    expect(next.columns.flatMap((c) => c.sections.map((s) => s.id))).not.toContain("crm_notes");
  });

  it("migrate is a no-op when name and phone already opposite", () => {
    const layout = defaultLayoutForModule("businesses");
    const next = migrateBusinessPhoneOppositeColumn(layout);
    expect(next).toEqual(layout);
  });
});
