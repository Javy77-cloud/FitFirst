import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { CORE_FIELDS, defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import {
  GARAGE_TYPE_OPTIONS,
  USAGE_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import {
  MHO_DETAILS_FIELDS,
  MHO_DETAILS_GROUPS,
  MHO_DISTANCE_TO_HYDRANT_OPTIONS,
  MHO_DISTANCE_TO_STATION_OPTIONS,
  MHO_FOUNDATION_OPTIONS,
  MHO_SCREEN_ENCLOSURE_OPTIONS,
  MHO_STRUCTURE_TYPE,
  MHO_MOBILE_HOME_TYPE,
  MHO_STRUCTURE_TYPE_OPTIONS,
  MHO_WATER_BACKUP_OPTIONS,
  MHO_YES_NO_OPTIONS,
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


  it("sits on the right under co-applicant (not under insured address)", () => {
    const html = renderDetails("MHO");
    const right = html.indexOf('data-ff-deal-details-col="right"');
    const left = html.indexOf('data-ff-deal-details-col="left"');
    const coApp = html.indexOf('data-ff-deal-section="co_applicant"');
    const mho = html.indexOf('data-ff-deal-section="mho"');
    const insured = html.indexOf('data-ff-deal-section="insured_address"');
    expect(right).toBeGreaterThan(-1);
    expect(coApp).toBeGreaterThan(right);
    expect(mho).toBeGreaterThan(coApp);
    // Still inside the right column chunk (before mailing if present, after co-app).
    expect(mho).toBeGreaterThan(right);
    expect(insured).toBeGreaterThan(left);
    expect(mho).toBeGreaterThan(insured); // right column renders after left in DOM
    // MHO must not appear between left-column sections only — co-app precedes it on the right.
    expect(html.slice(right, mho)).toMatch(/data-ff-deal-section="co_applicant"/);
  });

  it("asks the manufactured-home questions with Manufactured Home | Mobile Home structure type", () => {
    const html = renderDetails("MHO");
    for (const row of MHO_DETAILS_FIELDS) {
      if (row.showWhenKey) {
        expect(html).not.toMatch(new RegExp(`data-ff-deal-field="${row.key}"`));
        continue;
      }
      expect(html).toMatch(new RegExp(`data-ff-deal-field="${row.key}"`));
    }
    expect(html).not.toMatch(/data-ff-mho-locked="structure-type"/);
    expect(html).toMatch(/data-ff-mho-structure-type/);
    expect(html).toMatch(/data-ff-mho-structure-editable="1"/);
    expect(html).toMatch(/data-ff-picklist="structure_type"/);
    expect(html).not.toMatch(/data-ff-picklist="structure_type"[^>]*disabled/);
    expect(html).not.toMatch(/data-ff-mho-locked/);
    expect(MHO_STRUCTURE_TYPE_OPTIONS).toEqual([MHO_STRUCTURE_TYPE, MHO_MOBILE_HOME_TYPE]);
    expect(html).toContain(MHO_STRUCTURE_TYPE);
    expect(html).toContain(MHO_MOBILE_HOME_TYPE);
    expect(html).toMatch(/name="field_structure_type"/);
    expect(html).toMatch(/<option[^>]*>Manufactured Home<\/option>/);
    expect(html).toMatch(/<option[^>]*>Mobile Home<\/option>/);
    // Default selected value is Manufactured Home
    expect(html).toMatch(/value="Manufactured Home"|selected[^>]*>Manufactured Home/);
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
    expect(byKey.garage_type.options).toEqual([...GARAGE_TYPE_OPTIONS]);
    expect(byKey.garage_type.options).toEqual(home.garage_type.options);
    expect(byKey.usage.options).toEqual([...USAGE_OPTIONS]);
    expect(byKey.usage.options).toEqual(home.usage.options);
    expect(byKey.structure_type.options).toEqual([...MHO_STRUCTURE_TYPE_OPTIONS]);
    expect(byKey.exterior.options).toEqual(home.exterior.options);
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

  it("orders MHO Manufactured home dropdown options as specified", () => {
    const byKey = Object.fromEntries(MHO_DETAILS_FIELDS.map((field) => [field.key, field]));
    expect(byKey.basement.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.foundation.options).toEqual([...MHO_FOUNDATION_OPTIONS]);
    expect(byKey.carport.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.within_city_limits.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.screen_enclosure.options).toEqual([...MHO_SCREEN_ENCLOSURE_OPTIONS]);
    expect(byKey.water_backup.options).toEqual([...MHO_WATER_BACKUP_OPTIONS]);
    expect(byKey.trampoline.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.pool.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.animals.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.hydrant.options).toEqual([...MHO_DISTANCE_TO_HYDRANT_OPTIONS]);
    expect(byKey.miles_to_fire_station.options).toEqual([...MHO_DISTANCE_TO_STATION_OPTIONS]);
    expect(byKey.fire_alarm.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.smoke_detectors.options).toEqual([...MHO_YES_NO_OPTIONS]);
    expect(byKey.resided_under_2_years.options).toEqual([...MHO_YES_NO_OPTIONS]);

    const html = renderDetails("MHO");
    const optionOrder = (key: string) => {
      const marker = `data-ff-picklist="${key}"`;
      const start = html.indexOf(marker);
      expect(start, key).toBeGreaterThan(-1);
      const chunk = html.slice(start, html.indexOf("</select>", start));
      return [...chunk.matchAll(/<option[^>]*value="([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
    };
    expect(optionOrder("basement")).toEqual(["yes", "no"]);
    expect(optionOrder("foundation")).toEqual([...MHO_FOUNDATION_OPTIONS]);
    expect(optionOrder("carport")).toEqual(["yes", "no"]);
    expect(optionOrder("within_city_limits")).toEqual(["yes", "no"]);
    expect(optionOrder("screen_enclosure")).toEqual([...MHO_SCREEN_ENCLOSURE_OPTIONS]);
    expect(optionOrder("water_backup")).toEqual([...MHO_WATER_BACKUP_OPTIONS]);
    expect(optionOrder("trampoline")).toEqual(["yes", "no"]);
    expect(optionOrder("pool")).toEqual(["yes", "no"]);
    expect(optionOrder("animals")).toEqual(["yes", "no"]);
    expect(optionOrder("hydrant")).toEqual([...MHO_DISTANCE_TO_HYDRANT_OPTIONS]);
    expect(optionOrder("miles_to_fire_station")).toEqual([...MHO_DISTANCE_TO_STATION_OPTIONS]);
    expect(optionOrder("fire_alarm")).toEqual(["yes", "no"]);
    expect(optionOrder("smoke_detectors")).toEqual(["yes", "no"]);
    expect(optionOrder("resided_under_2_years")).toEqual(["yes", "no"]);
  });
});
