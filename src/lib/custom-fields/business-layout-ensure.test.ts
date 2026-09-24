import { describe, expect, it } from "vitest";
import { defaultLayoutForModule } from "./modules";
import { allLayoutFieldKeys, type FieldLayout } from "./types";
import { migrateBusinessPhoneOppositeColumn } from "./store";
import {
  migrateBusinessDetailsRowMap,
  needsBusinessDetailsRowMap,
} from "@/lib/businesses/business-detail-layout";

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
  it("default puts Details on left and Operations on right", () => {
    const layout = defaultLayoutForModule("businesses");
    const leftIds = layout.columns[0].sections.map((s) => s.id);
    const rightIds = layout.columns[1].sections.map((s) => s.id);
    expect(leftIds).toEqual(["business", "location", "contact"]);
    expect(rightIds).toEqual(["operations", "crm_notes"]);
    const left = new Set(layout.columns[0].sections.flatMap((s) => s.fieldKeys));
    const right = new Set(layout.columns[1].sections.flatMap((s) => s.fieldKeys));
    expect(left.has("business_name")).toBe(true);
    expect(left.has("phone")).toBe(true);
    expect(right.has("legal_name")).toBe(true);
    expect(right.has("business_name")).toBe(false);
    expect(needsBusinessDetailsRowMap(layout)).toBe(false);
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

  it("phone opposite migrate is a no-op when name and phone already opposite", () => {
    const opposite = twoCol(
      [
        {
          id: "business",
          label: "Business Info",
          fieldKeys: ["business_name", "dba", "ein"],
        },
      ],
      [{ id: "contact", label: "Business Contact", fieldKeys: ["phone", "email", "website"] }],
    );
    const next = migrateBusinessPhoneOppositeColumn(opposite);
    expect(next).toEqual(opposite);
  });

  it("row-map migrate keeps Operations on the right after agency left-stack mistake", () => {
    const agency = twoCol(
      [
        {
          id: "business",
          label: "Business Info",
          fieldKeys: ["business_name", "dba", "ein", "entity_type", "industry"],
          density: 4,
        },
        { id: "location", label: "Location", fieldKeys: ["mailing_address", "city", "state", "zip"] },
        {
          id: "contact",
          label: "Business Contact",
          fieldKeys: ["phone", "email", "website", "source", "referral"],
          density: 4,
        },
        {
          id: "operations",
          label: "Operations",
          fieldKeys: ["legal_name", "employee_count"],
          density: 4,
        },
      ],
      [{ id: "crm_notes", label: "CRM Notes", fieldKeys: ["notes"] }],
    );
    expect(needsBusinessDetailsRowMap(agency)).toBe(true);
    const next = migrateBusinessDetailsRowMap(agency);
    expect(next.columns[0].sections.map((s) => s.id)).toEqual([
      "business",
      "location",
      "contact",
    ]);
    expect(next.columns[1].sections.map((s) => s.id)[0]).toBe("operations");
    expect(needsBusinessDetailsRowMap(next)).toBe(false);
  });
});
