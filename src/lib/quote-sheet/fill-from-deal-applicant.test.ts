import { describe, expect, it } from "vitest";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";

describe("fill master sheet from Deal Details (applicant + co-applicant)", () => {
  it("copies applicant + co-applicant layout fields before docs/property enrichment", () => {
    const existing = emptySheetValues("home");
    const result = fillSheetFromDealDetails(
      {
        stored: {
          first_name: "Heather",
          last_name: "Camirand",
          date_of_birth: "1975-09-14",
          phone: "2395550100",
          email: "heather@example.com",
          applicant_gender: "Female",
          applicant_occupation: "Professional",
          applicant_employment: "Employed",
          applicant_marital_status: "Married",
          applicant_education_level: "Bachelor",
          entity_type: "LLC",
          mailing_address: "5181 Tallwood",
          city: "Naples",
          state: "FL",
          zip: "34113",
          contact_mailing_address: "PO Box 12",
          contact_mailing_city: "Naples",
          contact_mailing_state: "FL",
          contact_mailing_zip: "34102",
          co_applicant_first_name: "Tom",
          co_applicant_last_name: "Camirand",
          co_applicant_dob: "1974-01-02",
          co_applicant_email: "tom@example.com",
          co_applicant_phone: "2395550101",
          co_applicant_relationship_to_insured: "Spouse",
          co_applicant_gender: "Male",
          co_applicant_marital_status: "Married",
          co_applicant_occupation: "Trades",
          co_applicant_employment: "Self-employed",
          co_applicant_education_level: "Associate",
        },
      },
      existing,
    );

    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.applicant_dob).toBeUndefined();
    expect(result.values.co_applicant_name).toBeUndefined();
    expect(result.values.named_insured.value).toBe("Heather Camirand");
    expect(result.values.secondary_named_insured.value).toBe("Tom Camirand");

    expect(result.values.address1.value).toBe("5181 Tallwood");
    expect(result.values.city.value).toBe("Naples");
    expect(result.values.mailing_address.value).toBe("PO Box 12");
    expect(result.values.applicant_address).toBeUndefined();
    expect(result.values.driver_2_name).toBeUndefined();
  });

  it("copies landlord layout keys from Deal Details and leaves form to the cascade", () => {
    const existing = emptySheetValues("home", "landlord");
    const result = fillSheetFromDealDetails(
      {
        quotingForm: "DP3",
        policySubType: "DP3",
        stored: {
          insurance_subtype: "DP3",
          lease_term: "12 months",
          tenant_name: "Jane Tenant",
          landlord_liability: "100000",
          loss_of_rents: "30900",
          animals: "no",
          primary_heat: "Central air / heat",
          business_on_premises: "no",
        },
      },
      existing,
    );
    expect(result.values.form).toBeUndefined();
    expect(result.values.lease_term.value).toBe("12 months");
    expect(result.values.tenant_name.value).toBe("Jane Tenant");
    expect(result.values.landlord_liability.value).toBe("100000");
    expect(result.values.loss_of_rents.value).toBe("30900");
    expect(result.values.animals.value).toBe("no");
    expect(result.values.primary_heat.value).toBe("Central air / heat");
    expect(result.values.business_on_premises.value).toBe("no");
  });
});

describe("fill Auto Risk Profile drivers from Deal Details", () => {
  const camirandDeal = {
    primaryNamedInsured: "Heather Camirand",
    quotingLine: "auto" as const,
    stored: {
      first_name: "Heather",
      last_name: "Camirand",
      date_of_birth: "1975-09-14",
      applicant_gender: "Female",
      applicant_occupation: "Professional",
      applicant_employment: "Employed",
      applicant_marital_status: "Married",
      applicant_education_level: "Bachelor",
      has_co_applicant: "true",
      co_applicant_first_name: "Tom",
      co_applicant_last_name: "Camirand",
      co_applicant_dob: "1974-01-02",
      co_applicant_gender: "Male",
      co_applicant_occupation: "Trades",
      co_applicant_employment: "Self-employed",
      co_applicant_education_level: "Associate",
      co_applicant_marital_status: "Married",
      co_applicant_relationship_to_insured: "Spouse",
      co_applicant_license: "C1234567",
      co_applicant_license_status: "Valid",
      co_applicant_years_licensed: "20",
    },
  };

  it("maps primary → driver_1 and co-applicant On → driver_2 name+dob and key fields", () => {
    const result = fillSheetFromDealDetails(camirandDeal, emptySheetValues("auto"));

    expect(result.values.driver_1_name.value).toBe("Heather Camirand");
    expect(result.values.driver_1_dob.value).toBe("9/14/1975");
    expect(result.values.driver_1_gender.value).toBe("Female");
    expect(result.values.driver_1_occupation.value).toBe("Professional");
    expect(result.values.driver_1_relationship.value).toBe("Named insured");

    expect(result.values.driver_2_name.value).toBe("Tom Camirand");
    expect(result.values.driver_2_dob.value).toBe("1/2/1974");
    expect(result.values.driver_2_gender.value).toBe("Male");
    expect(result.values.driver_2_occupation.value).toBe("Trades");
    expect(result.values.driver_2_employment.value).toBe("Self-employed");
    expect(result.values.driver_2_education_level.value).toBe("Associate");
    expect(result.values.driver_2_marital_status.value).toBe("Married");
    expect(result.values.driver_2_relationship.value).toBe("Spouse");
    expect(result.values.driver_2_license.value).toBe("C1234567");
    expect(result.values.driver_2_status.value).toBe("Valid");
    expect(result.values.driver_2_years_licensed.value).toBe("20");
    expect(result.values.co_applicant_name).toBeUndefined();
    expect(result.filledKeys).toEqual(
      expect.arrayContaining(["driver_1_name", "driver_1_dob", "driver_2_name", "driver_2_dob"]),
    );
  });

  it("does not seed driver_2 when Deal Details co-applicant is Off", () => {
    const result = fillSheetFromDealDetails(
      {
        ...camirandDeal,
        stored: { ...camirandDeal.stored, has_co_applicant: "false" },
      },
      emptySheetValues("auto"),
    );
    expect(result.values.driver_1_name.value).toBe("Heather Camirand");
    expect(result.values.driver_2_name?.value ?? "").toBe("");
    expect(result.filledKeys).not.toContain("driver_2_name");
    expect(result.filledKeys).not.toContain("driver_2_dob");
  });

  it("does not overwrite an existing driver_2 and places the co-applicant in the next empty slot", () => {
    const existing = emptySheetValues("auto");
    existing.driver_2_name = { value: "Already There", status: "confirmed", source: "agent" };
    existing.driver_2_dob = { value: "5/5/1990", status: "confirmed", source: "agent" };
    const result = fillSheetFromDealDetails(camirandDeal, existing);
    expect(result.values.driver_2_name.value).toBe("Already There");
    expect(result.values.driver_2_dob.value).toBe("5/5/1990");
    expect(result.values.driver_3_name.value).toBe("Tom Camirand");
    expect(result.values.driver_3_dob.value).toBe("1/2/1974");
    expect(result.filledKeys).not.toContain("driver_2_name");
    expect(result.filledKeys).not.toContain("driver_2_dob");
  });

  it("maps an extra indexed co-applicant onto driver_3 and stays within the personal driver cap", () => {
    const result = fillSheetFromDealDetails(
      {
        ...camirandDeal,
        stored: {
          ...camirandDeal.stored,
          co_applicant_2_first_name: "Sam",
          co_applicant_2_last_name: "Camirand",
          co_applicant_2_dob: "2001-06-08",
          co_applicant_2_relationship: "Child",
        },
      },
      emptySheetValues("auto"),
    );
    expect(result.values.driver_2_name.value).toBe("Tom Camirand");
    expect(result.values.driver_3_name.value).toBe("Sam Camirand");
    expect(result.values.driver_3_dob.value).toBe("6/8/2001");
    expect(result.values.driver_3_relationship.value).toBe("Child");
    expect(result.values.driver_5_name).toBeUndefined();
  });

  it("leaves Home / Flood / Life / Health without auto driver slots", () => {
    for (const line of ["home", "flood", "life", "health"] as const) {
      const result = fillSheetFromDealDetails(camirandDeal, emptySheetValues(line));
      expect(result.values.driver_2_name).toBeUndefined();
      expect(result.filledKeys).not.toContain("driver_2_name");
    }
  });
});
