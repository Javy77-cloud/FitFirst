import { describe, expect, it } from "vitest";
import { policyInformationCoreKeys, policyInformationFields } from "./policy-information";

const elena = {
  policyNumber: "HO3-ELENA-2026",
  status: "active",
  lineOfBusiness: "HO",
  formType: "HO3",
  policyType: "Home",
  policySubType: "HO3",
  effectiveDate: new Date("2026-09-01T05:00:00.000Z"),
  expirationDate: new Date("2027-09-01T05:00:00.000Z"),
  premium: "2840.00",
  coverageA: 385000,
  billingFrequency: "annual",
  premisesAddress: "412 Harbor Isle Dr",
  premisesCity: "Melbourne",
  premisesState: "FL",
  premisesZip: "32935",
  sellingAgency: "afa",
  commission4Pct: "10",
};

const hale = {
  policyNumber: "HP-FL-88421",
  status: "active",
  lineOfBusiness: "HO",
  effectiveDate: new Date("2025-10-01T05:00:00.000Z"),
  expirationDate: new Date("2026-10-01T05:00:00.000Z"),
  premium: "2184.00",
  coverageA: 275000,
};

describe("policy information fields", () => {
  it("surfaces Elena carrier, effective, Cov A, insured, and premises without inventing a bind", () => {
    const fields = policyInformationFields({
      policy: elena,
      carrierName: "American Integrity",
      contact: { id: "elena-contact", firstName: "Elena", lastName: "Ruiz" },
    });
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    for (const key of policyInformationCoreKeys()) {
      expect(byKey[key], key).toBeDefined();
      expect(byKey[key].value).not.toBe("—");
    }
    expect(byKey.carrier.value).toBe("American Integrity");
    expect(byKey.effective.value).toBe("9-1-2026");
    expect(byKey.expiration.value).toBe("9-1-2027");
    expect(byKey.premium.value).toBe("$2,840");
    expect(byKey.coverageA.value).toBe("$385,000");
    expect(byKey.insured.value).toBe("Elena Ruiz");
    expect(byKey.insured.href).toBe("/contacts/elena-contact");
    expect(byKey.premises.label).toBe("Insured location");
    expect(byKey.subType.label).toBe("Form");
    expect(byKey.effective.label).toBe("Effective date");
    expect(byKey.expiration.label).toBe("Expiration date");
    expect(byKey.premises.value).toBe("412 Harbor Isle Dr, Melbourne, FL, 32935");
    expect(byKey.premises.value).not.toMatch(/Melbourne.*Melbourne/);
    expect(byKey.billing.value).toBe("Annual");
    expect(byKey.commission.value).toBe("10%");
    expect(byKey.sellingAgency.value).toBe("AFA");
    expect(fields.some((field) => field.key === "mortgagee")).toBe(false);
  });

  it("shows Hale Heritage + effective on a second in-force HO", () => {
    const fields = policyInformationFields({
      policy: hale,
      carrierName: "Heritage",
      contact: { id: "hale-contact", firstName: "Marcus", lastName: "Hale" },
    });
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(byKey.carrier.value).toBe("Heritage");
    expect(byKey.effective.value).toBe("10-1-2025");
    expect(byKey.coverageA.value).toBe("$275,000");
    expect(byKey.insured.href).toBe("/contacts/hale-contact");
    expect(byKey.premises).toBeUndefined();
  });

  it("links Harbor to the business when there is no personal contact", () => {
    const fields = policyInformationFields({
      policy: {
        policyNumber: "GL-HARBOR-2026",
        status: "active",
        lineOfBusiness: "GL",
        effectiveDate: new Date("2026-08-15T05:00:00.000Z"),
        expirationDate: new Date("2027-08-15T05:00:00.000Z"),
        premium: "4180.00",
        premisesAddress: "88 Harbor Key Blvd",
        premisesCity: "Palm Bay",
        premisesState: "FL",
        premisesZip: "32907",
      },
      account: { id: "harbor-account", name: "Harbor Key Marine LLC" },
    });
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(byKey.carrier.value).toBe("Carrier TBD");
    expect(byKey.effective.value).toBe("8-15-2026");
    expect(byKey.insured.value).toBe("Harbor Key Marine LLC");
    expect(byKey.insured.href).toBe("/accounts/harbor-account");
    expect(byKey.premises.value).toContain("88 Harbor Key Blvd");
  });

  it("strips city/state/zip already on the street and hides a duplicate location", () => {
    const fields = policyInformationFields({
      policy: {
        ...elena,
        premisesAddress: "15280 Tropic Ct, Fort Myers, FL 33967",
        premisesCity: "Fort Myers",
        premisesState: "FL",
        premisesZip: "33967",
      },
      carrierName: "American Integrity",
      locationLabel: "15280 Tropic Ct",
      mailing: {
        address: "15280 Tropic Ct",
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
      },
    });
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(byKey.premises.value).toBe("15280 Tropic Ct, Fort Myers, FL, 33967");
    expect(byKey.premises.value.match(/Fort Myers/g)).toHaveLength(1);
    expect(byKey.location).toBeUndefined();
  });

  it("labels a distinct mailing address instead of repeating insured location", () => {
    const fields = policyInformationFields({
      policy: elena,
      carrierName: "American Integrity",
      mailing: {
        address: "PO Box 100",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
      },
    });
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(byKey.location.label).toBe("Mailing address");
    expect(byKey.location.value).toContain("PO Box 100");
  });
});
