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

    expect(result.values.applicant_name.value).toBe("Heather Camirand");
    expect(result.values.applicant_dob.value).toBe("9/14/1975");
    expect(result.values.applicant_gender.value).toBe("Female");
    expect(result.values.applicant_occupation.value).toBe("Professional");
    expect(result.values.applicant_employment.value).toBe("Employed");
    expect(result.values.applicant_marital_status.value).toBe("Married");
    expect(result.values.applicant_education_level.value).toBe("Bachelor");
    expect(result.values.entity_type.value).toBe("LLC");
    expect(result.values.applicant_phone.value).toBe("2395550100");
    expect(result.values.applicant_email.value).toBe("heather@example.com");

    expect(result.values.co_applicant_name.value).toBe("Tom Camirand");
    expect(result.values.co_applicant_dob.value).toBe("1/2/1974");
    expect(result.values.co_applicant_relationship_to_insured.value).toBe("Spouse");
    expect(result.values.co_applicant_gender.value).toBe("Male");
    expect(result.values.co_applicant_marital_status.value).toBe("Married");
    expect(result.values.co_applicant_occupation.value).toBe("Trades");
    expect(result.values.co_applicant_employment.value).toBe("Self-employed");
    expect(result.values.co_applicant_education_level.value).toBe("Associate");
    expect(result.values.co_applicant_email.value).toBe("tom@example.com");
    expect(result.values.co_applicant_phone.value).toBe("2395550101");

    expect(result.values.address1.value).toBe("5181 Tallwood");
    expect(result.values.city.value).toBe("Naples");
    expect(result.values.mailing_address.value).toBe("PO Box 12");
    expect(result.values.applicant_address.value).toBe("PO Box 12");
    expect(result.values.applicant_dob.sourceLabel).toBe("deal details");
  });

  it("copies quotingForm / insurance_subtype onto form and landlord layout keys", () => {
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
    expect(result.values.form.value).toBe("DP3");
    expect(result.values.lease_term.value).toBe("12 months");
    expect(result.values.tenant_name.value).toBe("Jane Tenant");
    expect(result.values.landlord_liability.value).toBe("100000");
    expect(result.values.loss_of_rents.value).toBe("30900");
    expect(result.values.animals.value).toBe("no");
    expect(result.values.primary_heat.value).toBe("Central air / heat");
    expect(result.values.business_on_premises.value).toBe("no");
    expect(result.values.form.sourceLabel).toBe("deal details");
  });
});
