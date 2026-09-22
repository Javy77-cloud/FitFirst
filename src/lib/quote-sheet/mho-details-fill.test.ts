import { describe, expect, it } from "vitest";
import { blankSheetWithDefaults, emptySheetValues, fieldsForLine } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import { SHEET_DEFAULT_SOURCE_LABEL } from "@/lib/quote-sheet/sheet-defaults";
import { mhoDetailSheetWrites } from "@/lib/custom-fields/mho-details-fields";

const STORED = {
  tie_downs: "yes",
  hud_label: "HUD-123",
  mh_make: "Clayton",
  mh_model: "Destiny",
  mh_year: "1998",
  year_purchased: "2016",
  square_feet: "1200",
  beds: "3",
  baths: "2",
  living_units: "1",
  basement: "no",
  exterior: "Frame",
  foundation: "Piers (elevated)",
  garage_spaces: "1",
  garage_type: "Carport",
  carport: "yes",
  bfe: "6",
  elevation: "8.5",
  within_city_limits: "yes",
  usage: "Primary",
  screen_enclosure: "$10,000",
  water_backup: "$5,000",
  pool: "yes",
  trampoline: "no",
  animals: "no",
  hydrant: "Within 1,000 feet",
  miles_to_fire_station: "Within 5 miles",
  fire_alarm: "yes",
  smoke_detectors: "yes",
  resided_under_2_years: "yes",
  prior_residence_address: "117 Plantation Blvd",
  prior_residence_city: "Lake Worth",
  prior_residence_state: "FL",
  prior_residence_zip: "33467",
  months_occupied: "9+ months",
};

describe("MHO Deal Details fill", () => {
  it("maps each Details field onto the home sheet, including new unit identity keys", () => {
    const home = new Set(fieldsForLine("home", "homeowners").map((field) => field.key));
    for (const write of mhoDetailSheetWrites(STORED)) {
      expect(home.has(write.sheetKey), write.sheetKey).toBe(true);
    }
    const result = fillSheetFromDealDetails(
      { quotingForm: "MHO", quotingLine: "home", stored: STORED },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.mobile_home.value).toBe("yes");
    expect(result.values.structure_type.value).toBe("Manufactured Home");
    expect(result.values.tie_downs.value).toBe("yes");
    expect(result.values.hud_label.value).toBe("HUD-123");
    expect(result.values.mh_make.value).toBe("Clayton");
    expect(result.values.mh_model.value).toBe("Destiny");
    expect(result.values.mh_year.value).toBe("1998");
    expect(result.values.square_feet.value).toBe("1200");
    expect(result.values.garage_type.value).toBe("Carport");
    expect(result.values.garage_spaces.value).toBe("1");
    expect(result.values.bfe.value).toBe("6");
    expect(result.values.elevation.value).toBe("8.5");
    expect(result.values.screen_enclosure.value).toBe("$10,000");
    expect(result.values.water_backup.value).toBe("$5,000");
    expect(result.values.pool.value).toBe("yes");
    expect(result.values.hydrant.value).toBe("Within 1,000 feet");
    expect(result.values.miles_to_fire_station.value).toBe("Within 5 miles");
    expect(result.values.fire_alarm.value).toBe("yes");
    expect(result.values.smoke_detectors.value).toBe("yes");
    expect(result.values.prior_residence_address.value).toBe("117 Plantation Blvd");
    expect(result.values.prior_residence_zip.value).toBe("33467");
    expect(result.values.months_occupied.value).toBe("9+ months");
    expect(result.values.driver_1_name).toBeUndefined();
    expect(result.values.driver_2_name).toBeUndefined();
  });

  it("replaces starter defaults on an MHO sheet and hides prior address when the answer is no", () => {
    const sheet = blankSheetWithDefaults("home", "homeowners");
    expect(sheet.mobile_home.value).toBe("no");
    expect(sheet.mobile_home.sourceLabel).toBe(SHEET_DEFAULT_SOURCE_LABEL);
    expect(sheet.pool.value).toBe("no");
    const result = fillSheetFromDealDetails(
      {
        quotingForm: "MMHO",
        policySubType: "MHO",
        quotingLine: "home",
        stored: {
          ...STORED,
          resided_under_2_years: "no",
          prior_residence_address: "should not copy",
        },
      },
      sheet,
    );
    expect(result.values.mobile_home.value).toBe("yes");
    expect(result.values.mobile_home.sourceLabel).toBe("deal details");
    expect(result.values.pool.value).toBe("yes");
    expect(result.values.structure_type.value).toBe("Manufactured Home");
    expect(result.values.smoke_detectors.value).toBe("yes");
    expect(result.values.prior_residence_address.value).toBe("");
    expect(result.values.tie_downs.value).toBe("yes");
  });

  it("does not copy manufactured-home facts onto HO3 or Auto", () => {
    const ho3 = fillSheetFromDealDetails(
      { quotingForm: "HO3", quotingLine: "home", stored: STORED },
      blankSheetWithDefaults("home", "homeowners"),
    );
    expect(ho3.values.mobile_home.value).toBe("no");
    expect(ho3.values.tie_downs.value).toBe("");
    expect(ho3.values.hud_label.value).toBe("");
    expect(ho3.values.mh_make.value).toBe("");
    expect(ho3.values.structure_type.value).toBe("");

    const auto = fillSheetFromDealDetails(
      {
        quotingForm: "PA",
        quotingLine: "auto",
        primaryNamedInsured: "Catherine Garcia",
        stored: {
          ...STORED,
          has_co_applicant: "false",
          date_of_birth: "1975-09-14",
        },
      },
      emptySheetValues("auto"),
    );
    expect(auto.values.tie_downs).toBeUndefined();
    expect(auto.values.driver_1_name.value).toBe("Catherine Garcia");
    expect(auto.values.driver_2_name.value).toBe("");
  });

  it("does not overwrite agent-confirmed cells, and clears a prior address copied from Details", () => {
    const sheet = emptySheetValues("home", "homeowners");
    sheet.pool = { value: "no", status: "confirmed", source: "agent", sourceLabel: "agent" };
    sheet.tie_downs = { value: "no", status: "confirmed", source: "agent", sourceLabel: "agent" };
    const first = fillSheetFromDealDetails(
      { quotingForm: "MHO", quotingLine: "home", stored: STORED },
      sheet,
    );
    expect(first.values.pool.value).toBe("no");
    expect(first.values.tie_downs.value).toBe("no");
    expect(first.values.hud_label.value).toBe("HUD-123");
    expect(first.values.prior_residence_address.value).toBe("117 Plantation Blvd");

    const second = fillSheetFromDealDetails(
      {
        quotingForm: "MHO",
        quotingLine: "home",
        stored: { ...STORED, resided_under_2_years: "no" },
      },
      first.values,
    );
    expect(second.values.prior_residence_address.value).toBe("");
    expect(second.values.prior_residence_city.value).toBe("");
    expect(second.values.hud_label.value).toBe("HUD-123");
  });

  it("defaults smoke detectors to yes and structure type to Manufactured Home when Details are blank", () => {
    const result = fillSheetFromDealDetails(
      { quotingForm: "MHO", quotingLine: "home", stored: {} },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.smoke_detectors.value).toBe("yes");
    expect(result.values.structure_type.value).toBe("Manufactured Home");
    expect(result.values.mobile_home.value).toBe("yes");
    expect(result.values.tie_downs.value).toBe("");
    expect(result.values.square_feet.value).toBe("");
  });
});
