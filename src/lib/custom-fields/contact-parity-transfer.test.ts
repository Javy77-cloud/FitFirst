import { describe, expect, it } from "vitest";
import { DEAL_TO_CONTACT_FIELD_MAP } from "@/lib/contacts/contact-field-catalog";
import {
  emptyOnlyContactValues,
  incomingContactValuesFromDeal,
} from "@/lib/crm/contact-bind-transfer";
import {
  AUTO_DL_FIELDS,
  CONTACT_PARITY_CUSTOM_KEYS,
  CONTACT_PARITY_CRM_FIELDS,
} from "@/lib/custom-fields/contact-parity-fields";
import { CORE_FIELDS, defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { dealValuesFromLead, LEAD_TO_DEAL_CUSTOM_KEYS } from "@/lib/custom-fields/transfer";
import { productLayoutFields } from "@/lib/deals/product-layout";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";

describe("Deal Details Contact parity", () => {
  it("exposes Contact v4 person fields on Deal CORE + default layout", () => {
    const keys = new Set(CORE_FIELDS.map((field) => field.key));
    for (const field of CONTACT_PARITY_CRM_FIELDS) {
      expect(keys.has(field.key)).toBe(true);
    }
    const layoutKeys = allLayoutFieldKeys(defaultLayoutForLine("HO"));
    expect(layoutKeys).toEqual(
      expect.arrayContaining(["nickname", "referral", "secondary_phone", "dependents", "campaign_tag"]),
    );
    expect(layoutKeys).not.toContain("drivers_license_number");
  });

  it("keeps DL fields auto-only on Auto product catalog", () => {
    const autoKeys = productLayoutFields("auto").map((field) => field.key);
    for (const field of AUTO_DL_FIELDS) {
      expect(autoKeys).toContain(field.key);
    }
    expect(productLayoutFields("homeowners").map((field) => field.key)).not.toContain(
      "drivers_license_number",
    );
  });

  it("maps applicant_gender + dependents + DL onto Contact bind keys", () => {
    expect(DEAL_TO_CONTACT_FIELD_MAP.applicant_gender).toBe("gender");
    expect(DEAL_TO_CONTACT_FIELD_MAP.dependents).toBe("dependents");
    expect(DEAL_TO_CONTACT_FIELD_MAP.drivers_license_number).toBe("drivers_license_number");
    expect(DEAL_TO_CONTACT_FIELD_MAP.referral).toBe("referral");
  });

  it("copies referral + Contact parity customs Lead → Deal", () => {
    for (const key of CONTACT_PARITY_CUSTOM_KEYS) {
      expect(LEAD_TO_DEAL_CUSTOM_KEYS).toContain(key);
    }
    const values = dealValuesFromLead(
      {
        firstName: "Elena",
        lastName: "Ruiz",
        email: null,
        phone: null,
        mailingAddress: null,
        city: null,
        state: null,
        zip: null,
        dateOfBirth: null,
        notes: null,
        source: "referral",
        preferredLanguage: null,
        insuranceTypeDesired: null,
      },
      CORE_FIELDS,
      null,
      {
        referral: "Ana Dib",
        nickname: "Ellie",
        campaign_tag: "Melbourne HO",
        secondary_phone: "3215550199",
      },
    );
    expect(values.referral).toBe("Ana Dib");
    expect(values.nickname).toBe("Ellie");
    expect(values.campaign_tag).toBe("Melbourne HO");
    expect(values.source).toBe("referral");
  });

  it("empty-only bind transfers gender from applicant_gender and DL from auto sheet", () => {
    const { incoming } = incomingContactValuesFromDeal({
      dealCustom: {
        applicant_gender: "Female",
        referral: "Neighbor",
        nickname: "Ellie",
      },
      sheetValues: {
        driver_1_license: { value: "S400123846180" },
      },
      dealSource: "dec_drop",
    });
    expect(incoming.gender).toBe("Female");
    expect(incoming.applicant_gender).toBe("Female");
    expect(incoming.drivers_license_number).toBe("S400123846180");
    expect(incoming.referral).toBe("Neighbor");
    const patch = emptyOnlyContactValues(
      { gender: "", drivers_license_number: "", referral: "", nickname: "" },
      incoming,
    );
    expect(patch.gender).toBe("Female");
    expect(patch.drivers_license_number).toBe("S400123846180");
    expect(patch.referral).toBe("Neighbor");
    expect(patch.nickname).toBe("Ellie");
  });
});
