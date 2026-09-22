import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { CORE_FIELDS, defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import {
  GARAGE_TYPE_OPTIONS,
  SCREEN_ENCLOSURE_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  USAGE_OPTIONS,
  WATER_BACKUP_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import {
  MHO_DETAILS_FIELDS,
  MHO_DETAILS_GROUPS,
  dealPolicyFormIsMho,
} from "@/lib/custom-fields/mho-details-fields";

function renderDetails(quotingForm: string, values: Record<string, string> = {}) {
  return renderToStaticMarkup(
    createElement(DealDetailsPanel, {
      dealId: "deal-mho",
      line: "HO",
      layout: defaultLayoutForLine("HO"),
      fields: [],
      values,
      quotingForm,
      policySubType: quotingForm,
    }),
  );
}

describe("MHO Deal Details section", () => {
  it("renders only for manufactured / mobile home forms", () => {
    expect(dealPolicyFormIsMho("MHO")).toBe(true);
    expect(dealPolicyFormIsMho("MMHO")).toBe(true);
    expect(dealPolicyFormIsMho("Manufactured Home")).toBe(true);
    for (const form of ["HO3", "HO5", "DP1", "DP3", "Auto", "PA", "FLOOD"]) {
      const html = renderDetails(form);
      expect(html, form).not.toMatch(/data-ff-deal-section="mho"/);
      expect(html, form).not.toMatch(/data-ff-deal-field="tie_downs"/);
    }
    const mho = renderDetails("MHO");
    expect(mho).toMatch(/data-ff-deal-section="mho"/);
    expect(mho).toMatch(/data-ff-mho-toggle/);
    expect(mho).toMatch(/aria-expanded="true"/);
    expect(mho).toMatch(/data-ff-section-density="2"/);
    for (const group of MHO_DETAILS_GROUPS) {
      expect(mho).toContain(group.title);
      expect(mho).toMatch(new RegExp(`data-ff-mho-group="${group.id}"`));
    }
  });

  it("asks the manufactured-home questions and locks structure type", () => {
    const html = renderDetails("MHO");
    for (const row of MHO_DETAILS_FIELDS) {
      if (row.showWhenKey) {
        expect(html).not.toMatch(new RegExp(`data-ff-deal-field="${row.key}"`));
        continue;
      }
      expect(html).toMatch(new RegExp(`data-ff-deal-field="${row.key}"`));
    }
    expect(html).toMatch(/data-ff-mho-locked="structure-type"/);
    expect(html).toContain("Manufactured Home");
    expect(html).toMatch(/name="field_structure_type"[^>]*value="Manufactured Home"/);
    expect(html).toMatch(/name="field_smoke_detectors"/);
    expect(html).toMatch(/value="yes"/);
    expect(html).not.toMatch(/HMO/);
  });

  it("shows prior residence only when resides under two years is yes", () => {
    const hidden = renderDetails("MHO", { resided_under_2_years: "no" });
    expect(hidden).not.toMatch(/data-ff-deal-field="prior_residence_address"/);
    expect(hidden).toMatch(/name="field_prior_residence_address"[^>]*value=""/);
    expect(hidden).toMatch(/data-ff-deal-field="months_occupied"/);

    const shown = renderDetails("MHO", {
      resided_under_2_years: "yes",
      prior_residence_address: "9 Pine",
      prior_residence_city: "Lake Worth",
      prior_residence_state: "FL",
      prior_residence_zip: "33467",
    });
    expect(shown).toMatch(/data-ff-deal-field="prior_residence_address"/);
    expect(shown).toMatch(/data-ff-deal-field="prior_residence_city"/);
    expect(shown).toMatch(/data-ff-deal-field="prior_residence_state"/);
    expect(shown).toMatch(/data-ff-deal-field="prior_residence_zip"/);
    expect(shown).toContain("9 Pine");
    expect(shown).toContain("33467");
  });

  it("reuses Risk Profile option sets for shared picklists", () => {
    const home = Object.fromEntries(fieldsForLine("home", "homeowners").map((field) => [field.key, field]));
    const byKey = Object.fromEntries(MHO_DETAILS_FIELDS.map((field) => [field.key, field]));
    expect(byKey.tie_downs.options).toEqual([...YES_NO_OPTIONS]);
    expect(byKey.garage_type.options).toEqual([...GARAGE_TYPE_OPTIONS]);
    expect(byKey.garage_type.options).toEqual(home.garage_type.options);
    expect(byKey.usage.options).toEqual([...USAGE_OPTIONS]);
    expect(byKey.usage.options).toEqual(home.usage.options);
    expect(byKey.screen_enclosure.options).toEqual([...SCREEN_ENCLOSURE_OPTIONS]);
    expect(byKey.water_backup.options).toEqual([...WATER_BACKUP_OPTIONS]);
    expect(byKey.structure_type.options).toEqual([...STRUCTURE_TYPE_OPTIONS]);
    expect(byKey.exterior.options).toEqual(home.exterior.options);
    expect(byKey.foundation.options).toEqual(home.foundation.options);
    expect(byKey.hydrant.options).toEqual(home.hydrant.options);
    expect(byKey.miles_to_fire_station.options).toEqual(home.miles_to_fire_station.options);
    expect(byKey.months_occupied.options).toEqual(home.months_occupied.options);
    expect(home.tie_downs.extractKey).toBeUndefined();
    expect(home.hud_label.extractKey).toBeUndefined();
    expect(home.mh_make.options).toBeUndefined();
    expect(home.mh_make.showWhen).toEqual({ key: "mobile_home", values: ["yes"] });
    const catalog = new Set(CORE_FIELDS.map((field) => field.key));
    for (const row of MHO_DETAILS_FIELDS) {
      expect(catalog.has(row.key), row.key).toBe(true);
    }
  });
});
