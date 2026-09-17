import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { LEAD_TO_DEAL_CUSTOM_KEYS } from "@/lib/custom-fields/transfer";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { PIPELINE_STRIP_FIELD_KEYS } from "@/lib/custom-fields/insurance-quote-section";
import { layoutForActiveProduct } from "./product-layout";
import {
  canonicalizeSellingAgencyKey,
  canonicalizeSellingAgencyLayout,
  canonicalizeSellingAgencyValues,
  DEAL_SELLING_AGENCY_FIELD,
  DEAL_SELLING_AGENCY_KEY,
  defaultSellingAgencyValue,
  isSellingAgencyField,
  mergeSellingAgencyStoredValues,
  sellingAgencyKeyForNewField,
} from "./selling-agency";

describe("deal selling agency canonical key", () => {
  it("keeps the older list column picklist_yp0c — not a new selling_agency layout field", () => {
    expect(DEAL_SELLING_AGENCY_KEY).toBe("picklist_yp0c");
    expect(canonicalizeSellingAgencyKey("selling_agency")).toBe("picklist_yp0c");
    expect(canonicalizeSellingAgencyKey("sellingAgency")).toBe("picklist_yp0c");
    expect(canonicalizeSellingAgencyKey("picklist_yp0c")).toBe("picklist_yp0c");
    expect(canonicalizeSellingAgencyKey("first_name")).toBe("first_name");
    expect(sellingAgencyKeyForNewField({ label: "Selling Agency" })).toBe("picklist_yp0c");
    expect(sellingAgencyKeyForNewField({ key: "selling_agency" })).toBe("picklist_yp0c");
    expect(isSellingAgencyField({ key: "picklist_new1", label: "Selling agency" })).toBe(true);
    expect(isSellingAgencyField({ key: "notes", label: "Notes" })).toBe(false);
  });

  it("does not invent an agency name when options are empty or many", () => {
    expect(defaultSellingAgencyValue([])).toBe("");
    expect(defaultSellingAgencyValue(["AFA", "First Connect"])).toBe("");
    expect(defaultSellingAgencyValue(["  AFA  ", "AFA"])).toBe("AFA");
  });

  it("reads existing list values and folds a blank Details alias onto the same key", () => {
    expect(
      mergeSellingAgencyStoredValues({ picklist_yp0c: "Dominic Iori desk", selling_agency: "" })
        .picklist_yp0c,
    ).toBe("Dominic Iori desk");
    expect(
      mergeSellingAgencyStoredValues({ picklist_yp0c: "", selling_agency: "Rosa desk" }).picklist_yp0c,
    ).toBe("Rosa desk");
    expect(
      canonicalizeSellingAgencyValues({ selling_agency: "AFA", first_name: "Rosa" }),
    ).toEqual({ picklist_yp0c: "AFA", first_name: "Rosa" });
    expect(
      canonicalizeSellingAgencyValues({ picklist_yp0c: "First Connect", selling_agency: "ignored" }),
    ).toEqual({ picklist_yp0c: "First Connect" });
  });

  it("remaps a duplicate Deal Details field onto the list column and parks it on Pipeline", () => {
    const remapped = canonicalizeSellingAgencyLayout(
      {
        columns: [
          {
            id: "left",
            sections: [
              { id: "contact", label: "Contact", fieldKeys: ["first_name", "selling_agency"] },
            ],
          },
          {
            id: "right",
            sections: [
              {
                id: "pipeline",
                label: "Pipeline",
                fieldKeys: ["insurance_type", "insurance_category", "insurance_subtype"],
              },
            ],
          },
        ],
      },
      [
        { key: "picklist_yp0c", label: "Selling Agency" },
        { key: "selling_agency", label: "Selling agency" },
      ],
    );
    const keys = allLayoutFieldKeys(remapped);
    expect(keys.filter((key) => key === "picklist_yp0c")).toEqual(["picklist_yp0c"]);
    expect(keys).not.toContain("selling_agency");
    expect(remapped.columns[1]?.sections[0]?.fieldKeys).toContain("picklist_yp0c");
    expect(remapped.columns[0]?.sections[0]?.fieldKeys).not.toContain("picklist_yp0c");
  });

  it("binds default Deal + Lead layouts and the live Pipeline strip to picklist_yp0c", () => {
    expect(allLayoutFieldKeys(defaultLayoutForLine("HO"))).toContain("picklist_yp0c");
    expect(allLayoutFieldKeys(defaultLayoutForModule("leads"))).toContain("picklist_yp0c");
    expect(PIPELINE_STRIP_FIELD_KEYS).toContain("picklist_yp0c");
    const live = layoutForActiveProduct(defaultLayoutForLine("HO"), "homeowners");
    expect(live.columns[1]?.sections[0]?.fieldKeys).toEqual([
      "insurance_type",
      "insurance_category",
      "insurance_subtype",
      "picklist_yp0c",
    ]);
    expect(LEAD_TO_DEAL_CUSTOM_KEYS).toContain("picklist_yp0c");
    expect(DEAL_SELLING_AGENCY_FIELD.required).toBe(true);
    expect(DEAL_SELLING_AGENCY_FIELD.globalListKey).toBe("selling_agency");
  });

  it("writes create/save form posts for either key onto picklist_yp0c only", () => {
    const defs = [
      { key: "first_name", label: "First name", type: "single_line" as const },
      { key: "selling_agency", label: "Selling agency", type: "picklist" as const, options: ["A"] },
      DEAL_SELLING_AGENCY_FIELD,
    ];
    const form = new FormData();
    form.set("field_first_name", "Rosa");
    form.set("field_selling_agency", "AFA");
    expect(customValuesFromForm(form, defs)).toEqual({
      first_name: "Rosa",
      picklist_yp0c: "AFA",
    });
  });

  it("requires Selling agency on Deal Details and create next to Pipeline / Policy form", () => {
    const details = readFileSync("src/components/custom-fields/deal-details-panel.tsx", "utf8");
    const create = readFileSync("src/app/actions/crm.ts", "utf8");
    const builder = readFileSync("src/app/actions/custom-fields.ts", "utf8");
    expect(details).toMatch(/data-ff-required-field="selling-agency"/);
    expect(details).toMatch(/field_\$\{DEAL_SELLING_AGENCY_KEY\}/);
    expect(create).toMatch(/DEAL_SELLING_AGENCY_KEY/);
    expect(create).toMatch(/persistNewDealLayoutValues/);
    expect(builder).toMatch(/sellingAgencyKeyForNewField/);
    expect(builder).toMatch(/canonicalizeSellingAgencyLayout/);
  });
});
