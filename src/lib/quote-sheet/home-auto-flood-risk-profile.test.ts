import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import {
  APPLICANT_CORE_FIELDS,
  CO_APPLICANT_FIELDS,
} from "./applicant-core";
import {
  emptySheetValues,
  extractKeyToSheetKey,
  fieldsForLine,
  homeFieldCount,
  sheetFieldIsVisible,
} from "./catalog";
import { fillSheetFromDealDetails } from "./fill-from-deal";
import {
  AAA_MEMBER_OPTIONS,
  PASSIVE_RESTRAINT_OPTIONS,
  SCREEN_ENCLOSURE_OPTIONS,
  YES_NO_OPTIONS,
} from "./sheet-defaults";

const IDENTITY_KEYS = [
  ...APPLICANT_CORE_FIELDS.map((field) => field.key),
  ...CO_APPLICANT_FIELDS.map((field) => field.key),
];

describe("Home / Auto / Flood Risk Profile vs Deal Details", () => {
  it("drops Deal Details identity from Home, Auto, and Flood catalogs", () => {
    for (const line of ["home", "auto", "flood"] as const) {
      const keys = new Set(
        (line === "home" ? fieldsForLine("home", "homeowners") : fieldsForLine(line)).map(
          (field) => field.key,
        ),
      );
      for (const key of IDENTITY_KEYS) {
        expect(keys.has(key), `${line} still shows ${key}`).toBe(false);
      }
    }
    expect(homeFieldCount()).toBeGreaterThanOrEqual(90);
  });

  it("keeps product / quoting keys and reuses existing field keys", () => {
    const home = Object.fromEntries(fieldsForLine("home", "homeowners").map((f) => [f.key, f]));
    const auto = Object.fromEntries(fieldsForLine("auto").map((f) => [f.key, f]));
    const flood = Object.fromEntries(fieldsForLine("flood").map((f) => [f.key, f]));

    expect(home.year_built).toBeTruthy();
    expect(home.coverage_a).toBeTruthy();
    expect(home.construction).toBeTruthy();
    expect(home.address1?.label).toBe("Property address");
    expect(home.sale_price?.label).toBe("Purchase price");
    expect(home.dog_breed?.label).toBe("Restricted / vicious breed?");
    expect(home.dog_breed?.options).toEqual([...YES_NO_OPTIONS]);
    expect(home.new_purchase).toMatchObject({ input: "select", group: "Property" });
    expect(home.new_purchase.options).toEqual([...YES_NO_OPTIONS]);
    expect(home.purchase_date?.showWhen).toEqual({ key: "new_purchase", values: ["yes"] });
    expect(home.within_city_limits?.label).toBe("City within city limits");
    expect(home.screen_enclosure?.options).toEqual([...SCREEN_ENCLOSURE_OPTIONS]);
    expect(home.roof_deck).toBeTruthy();
    expect(home.named_insured).toBeTruthy();
    expect(home.insurance_score_range).toBeTruthy();

    expect(auto.vin).toBeTruthy();
    expect(auto.driver_1_name).toBeTruthy();
    expect(auto.driver_1_license).toBeTruthy();
    expect(auto.own_rent).toBeTruthy();
    expect(auto.years_at_address).toBeTruthy();
    expect(auto.aaa_member?.options).toEqual([...AAA_MEMBER_OPTIONS]);
    expect(auto.passive_restraints?.options).toEqual([...PASSIVE_RESTRAINT_OPTIONS]);

    expect(flood.flood_zone).toBeTruthy();
    expect(flood.year_built).toBeTruthy();
    expect(flood.address1).toBeTruthy();
    expect(flood.coverage_a?.label).toBe("Building coverage (Cov A)");
    expect(flood.building_limit).toBeTruthy();
  });

  it("hides Home purchase date until New purchase is yes", () => {
    const purchaseDate = fieldsForLine("home", "homeowners").find((f) => f.key === "purchase_date");
    expect(sheetFieldIsVisible(purchaseDate!, { new_purchase: "no" })).toBe(false);
    expect(sheetFieldIsVisible(purchaseDate!, { new_purchase: "yes" })).toBe(true);
  });

  it("does not rewrite Life / Health / Commercial identity rules", () => {
    expect(fieldsForLine("life").some((field) => field.key === "applicant_name")).toBe(false);
    expect(fieldsForLine("health").some((field) => field.key === "medicare_number")).toBe(true);
    expect(fieldsForLine("bop").some((field) => field.key === "coverage_lines")).toBe(true);
    expect(fieldsForLine("rec_rv").some((field) => field.key === "applicant_name")).toBe(true);
  });

  it("reuses extract aliases onto existing keys", () => {
    expect(extractKeyToSheetKey("home", "purchase_price")).toBe("sale_price");
    expect(extractKeyToSheetKey("home", "city_limits")).toBe("within_city_limits");
    expect(extractKeyToSheetKey("auto", "aaa")).toBe("aaa_member");
    expect(extractKeyToSheetKey("auto", "passive_restraint")).toBe("passive_restraints");
  });

  it("Fill does not invent identity on a new Home sheet; still copies property keys", () => {
    const result = fillSheetFromDealDetails(
      {
        stored: {
          first_name: "Heather",
          last_name: "Camirand",
          date_of_birth: "1975-09-14",
          phone: "2395550100",
          mailing_address: "5181 Tallwood",
          city: "Naples",
          state: "FL",
          zip: "34113",
          previous_address: "9 Pine",
          new_purchase: "yes",
          purchase_date: "3/1/2026",
          sale_price: "410000",
        },
      },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.applicant_dob).toBeUndefined();
    expect(result.values.co_applicant_name).toBeUndefined();
    expect(result.values.address1.value).toBe("5181 Tallwood");
    expect(result.values.city.value).toBe("Naples");
    expect(result.values.named_insured.value).toBe("Heather Camirand");
    expect(result.values.new_purchase.value).toBe("yes");
    expect(result.values.purchase_date.value).toBe("3/1/2026");
    expect(result.values.sale_price.value).toBe("410000");
    expect(result.values.prior_address).toBeUndefined();
  });

  it("Fill still updates previously saved identity keys (does not wipe agent data)", () => {
    const existing = emptySheetValues("home", "homeowners");
    existing.applicant_name = { value: "Old Name", status: "missing", source: "blank" };
    existing.applicant_dob = { value: "", status: "missing", source: "blank" };
    const result = fillSheetFromDealDetails(
      {
        stored: {
          first_name: "Heather",
          last_name: "Camirand",
          date_of_birth: "1975-09-14",
        },
      },
      existing,
    );
    expect(result.values.applicant_name.value).toBe("Heather Camirand");
    expect(result.values.applicant_dob.value).toBe("9/14/1975");
  });

  it("Fill copies Auto driver slots and prior address from Deal Details", () => {
    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Heather Camirand",
        stored: {
          date_of_birth: "1975-09-14",
          previous_address: "9 Pine St",
          aaa_member: "None",
        },
      },
      emptySheetValues("auto"),
    );
    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.driver_1_name.value).toBe("Heather Camirand");
    expect(result.values.driver_1_dob.value).toBe("9/14/1975");
    expect(result.values.prior_address.value).toBe("9 Pine St");
    expect(result.values.aaa_member.value).toBe("None");
  });

  it("renders Home / Auto / Flood without Applicant name and with new product labels", () => {
    const home = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-home",
        line: "home",
        fields: [],
        values: {
          ...emptySheetValues("home", "homeowners"),
          new_purchase: { value: "yes", status: "confirmed", source: "agent" },
        },
        product: "homeowners",
      }),
    );
    expect(home).toContain("Purchase price");
    expect(home).toContain("New purchase?");
    expect(home).toContain("Purchase date");
    expect(home).toContain("City within city limits");
    expect(home).toContain("Screen enclosure coverage");
    expect(home).toContain("Restricted / vicious breed?");
    expect(home).not.toContain("Applicant name");
    expect(home).not.toContain("Co-applicant name");

    const auto = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-auto",
        line: "auto",
        fields: [],
        values: emptySheetValues("auto"),
        product: "auto",
      }),
    );
    expect(auto).toContain("AAA member");
    expect(auto).toContain("Passive restraints (airbags)?");
    expect(auto).toContain("VIN");
    expect(auto).not.toContain("Applicant name");

    const flood = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-flood",
        line: "flood",
        fields: [],
        values: emptySheetValues("flood"),
        product: "flood",
      }),
    );
    expect(flood).toContain("Building coverage (Cov A)");
    expect(flood).toContain("Flood zone");
    expect(flood).not.toContain("Applicant name");
  });
});
