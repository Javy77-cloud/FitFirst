import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { incomingContactValuesFromDeal } from "@/lib/crm/contact-bind-transfer";
import { defaultFieldsForLine, defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { distinctMailingLabel, mailingAddressLine } from "@/lib/desk/policy-information";
import { resolveDealHeaderAddresses } from "@/lib/deals/header-addresses";
import {
  moveSoleSheetMailingToProperty,
  resolveHomeRiskAddresses,
} from "@/lib/quote-sheet/home-address-fill";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import {
  DWELLING_INSURED_ADDRESS_LABEL,
  DWELLING_MAILING_ADDRESS_LABEL,
  dwellingDetailsFieldLabel,
  dwellingPolicyAddresses,
  dwellingRiskFieldLabel,
  isDwellingFireProduct,
  seedDwellingFireAddresses,
} from "./dwelling-addresses";

const rental = {
  street: "18025 Cypress Point Rd",
  city: "Fort Myers",
  state: "FL",
  zip: "33912",
};

const home = {
  street: "8561 SW 85th St Ave",
  city: "Miami",
  state: "FL",
  zip: "33173",
};

describe("DP1/DP3 address product check", () => {
  it("matches dwelling fire forms and leaves HO3, flood, and auto alone", () => {
    expect(isDwellingFireProduct("DP1")).toBe(true);
    expect(isDwellingFireProduct("DP3")).toBe(true);
    expect(isDwellingFireProduct("Landlord")).toBe(true);
    expect(isDwellingFireProduct("dp-3")).toBe(true);
    expect(isDwellingFireProduct("HO3")).toBe(false);
    expect(isDwellingFireProduct("HO5", "FLOOD", "PA", "MHO")).toBe(false);
    expect(isDwellingFireProduct("homeowners", "flood", "auto")).toBe(false);
  });
});

describe("DP1/DP3 seed", () => {
  it("prefills mailing from the contact home and leaves the insured rental blank", () => {
    const seed = seedDwellingFireAddresses({ partyHome: home });
    expect(seed.insured.street).toBe("");
    expect(seed.mailing).toEqual(home);
    expect(seed.sameFlag).toBe("false");
    expect(seed.custom.mailing_address).toBe("");
    expect(seed.custom.contact_mailing_address).toBe(home.street);
    expect(seed.custom.contact_mailing_city).toBe("Miami");
    expect(seed.custom.mailing_same_as_insured).toBe("false");
  });

  it("drops a copied home off the insured slot and keeps a real rental", () => {
    const copied = seedDwellingFireAddresses({
      insured: home,
      partyHome: home,
    });
    expect(copied.insured.street).toBe("");
    expect(copied.mailing.street).toBe(home.street);

    const split = seedDwellingFireAddresses({
      insured: rental,
      partyHome: home,
    });
    expect(split.insured).toEqual(rental);
    expect(split.mailing).toEqual(home);
    expect(split.sameFlag).toBe("false");
  });

  it("keeps an explicit same-as-insured rental", () => {
    const seed = seedDwellingFireAddresses({
      insured: rental,
      partyHome: rental,
      sameFlag: "true",
    });
    expect(seed.insured.street).toBe(rental.street);
    expect(seed.sameFlag).toBe("true");
  });
});

describe("DP1/DP3 bind split", () => {
  it("puts the insured rental on premises and the owner home on mailing", () => {
    const split = dwellingPolicyAddresses({
      stored: {
        mailing_address: rental.street,
        city: rental.city,
        state: rental.state,
        zip: rental.zip,
        contact_mailing_address: home.street,
        contact_mailing_city: home.city,
        contact_mailing_state: home.state,
        contact_mailing_zip: home.zip,
        mailing_same_as_insured: "false",
      },
      partyHome: { mailingAddress: "999 Should Not Win", city: "Tampa", state: "FL", zip: "33602" },
    });
    expect(split.premises).toEqual(rental);
    expect(split.mailing).toEqual(home);
    expect(split.insuredSameAsMailing).toBe(false);
  });

  it("does not substitute the owner's home when the rental is still blank", () => {
    const split = dwellingPolicyAddresses({
      stored: { mailing_same_as_insured: "false" },
      risk: { address1: "", city: "", state: "FL", zip: "" },
      partyHome: { mailingAddress: home.street, city: home.city, state: home.state, zip: home.zip },
    });
    expect(split.premises.street).toBe("");
    expect(split.mailing).toEqual(home);
    expect(split.insuredSameAsMailing).toBe(false);
  });
});

describe("HO3 address behavior stays", () => {
  it("still treats the contact home as the insured location", () => {
    const resolved = resolveDealHeaderAddresses({
      stored: {},
      contact: { mailingAddress: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
    });
    expect(resolved.insured.address1).toBe("12 Oak St");
    expect(resolved.showMailing).toBe(false);
  });

  it("still uses the contact home as the quote property when the risk is empty", () => {
    const resolved = resolveHomeRiskAddresses({
      contact: { mailingAddress: home.street, city: home.city, state: home.state, zip: home.zip },
    });
    expect(resolved.property.street).toBe(home.street);
    expect(resolved.property.city).toBe("Miami");
    expect(resolved.mailing.street).toBe("");
  });

  it("still copies the insured address onto the contact for HO3", () => {
    const { incoming, propertyKind } = incomingContactValuesFromDeal({
      dealCustom: { mailing_address: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
      product: "HO3",
      quotingForm: "HO3",
    });
    expect(propertyKind).toBe("primary");
    expect(incoming.mailing_address).toBe("12 Oak St");
  });

  it("keeps the Risk Profile property label on HO3", () => {
    const property = fieldsForLine("home", "homeowners", "HO3").find((field) => field.key === "address1");
    expect(property?.label).toBe("Property address");
    expect(dwellingRiskFieldLabel("address1", false, property?.label ?? "")).toBe("Property address");
    expect(dwellingDetailsFieldLabel("mailing_address", false, "Insured Address")).toBe("Insured Address");
  });
});

describe("DP1/DP3 quoting and header", () => {
  it("does not geocode the owner home as the rental", () => {
    const resolved = resolveHomeRiskAddresses({
      dwellingFire: true,
      stored: {
        contact_mailing_address: home.street,
        contact_mailing_city: home.city,
        contact_mailing_state: home.state,
        contact_mailing_zip: home.zip,
      },
      contact: { mailingAddress: home.street, city: home.city, state: home.state, zip: home.zip },
      risk: { address1: rental.street, city: rental.city, state: rental.state, zip: rental.zip },
    });
    expect(resolved.property.street).toBe(rental.street);
    expect(resolved.property.city).toBe("Fort Myers");
    expect(resolved.mailing.street).toBe(home.street);
    expect(resolved.mailingReason).toBe("distinct");
  });

  it("leaves the property blank when only the owner home is known", () => {
    const resolved = resolveHomeRiskAddresses({
      dwellingFire: true,
      contact: { mailingAddress: home.street, city: home.city, state: home.state, zip: home.zip },
    });
    expect(resolved.property.street).toBe("");
    expect(resolved.mailing.street).toBe(home.street);
  });

  it("does not move a sole mailing onto the rental", () => {
    const unlocked = { value: home.street, status: "confirmed" as const, source: "extracted" as const };
    const moved = moveSoleSheetMailingToProperty(
      {
        address1: { value: "", status: "missing", source: "blank" },
        mailing_address: unlocked,
      },
      { dwellingFire: true },
    );
    expect(moved.filledKeys).toEqual([]);
    expect(moved.values.address1.value).toBe("");
    expect(moved.values.mailing_address.value).toBe(home.street);

    const ho3 = moveSoleSheetMailingToProperty({
      address1: { value: "", status: "missing", source: "blank" },
      mailing_address: { value: "12 Oak St", status: "confirmed", source: "extracted" },
    });
    expect(ho3.filledKeys).toContain("address1");
    expect(ho3.values.address1.value).toBe("12 Oak St");
    expect(ho3.values.mailing_address.value).toBe("");
  });

  it("shows the contact home as mailing, not as the insured rental", () => {
    const resolved = resolveDealHeaderAddresses({
      dwellingFire: true,
      stored: {},
      contact: { mailingAddress: home.street, city: home.city, state: home.state, zip: home.zip },
    });
    expect(resolved.insured.address1).toBe("");
    expect(resolved.mailing.address1).toBe(home.street);
    expect(resolved.showMailing).toBe(true);
  });

  it("copies the owner mailing onto the contact and not the rental", () => {
    const { incoming } = incomingContactValuesFromDeal({
      dealCustom: {
        mailing_address: rental.street,
        city: rental.city,
        state: rental.state,
        zip: rental.zip,
        contact_mailing_address: home.street,
        contact_mailing_city: home.city,
        contact_mailing_state: home.state,
        contact_mailing_zip: home.zip,
      },
      lead: { mailingAddress: "PO Box 1", city: "Naples", state: "FL", zip: "34102" },
      product: "DP3",
      quotingForm: "DP3",
    });
    expect(incoming.mailing_address).toBe(home.street);
    expect(incoming.city).toBe("Miami");
    expect(incoming.mailing_address).not.toBe(rental.street);
  });
});

describe("DP1/DP3 deal detail labels", () => {
  it("labels both addresses and keeps the same-as toggle", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-dp3",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: defaultFieldsForLine("HO"),
        values: {
          insurance_subtype: "DP3",
          mailing_same_as_insured: "false",
          mailing_address: rental.street,
          contact_mailing_address: home.street,
        },
        quotingForm: "DP3",
        policySubType: "DP3",
      }),
    );
    expect(html).toContain(DWELLING_INSURED_ADDRESS_LABEL);
    expect(html).toContain(DWELLING_MAILING_ADDRESS_LABEL);
    expect(html).toContain("Mailing address same as insured address");
    expect(html).toContain('data-ff-dwelling-fire="1"');
    expect(html).toContain(rental.street);
    expect(html).toContain(home.street);
  });

  it("keeps HO3 labels", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-ho3",
        line: "HO",
        layout: defaultLayoutForLine("HO"),
        fields: defaultFieldsForLine("HO"),
        values: { insurance_subtype: "HO3", mailing_address: "12 Oak St" },
        quotingForm: "HO3",
        policySubType: "HO3",
      }),
    );
    expect(html).toContain("Insured Address");
    expect(html).not.toContain(DWELLING_INSURED_ADDRESS_LABEL);
    expect(html).not.toContain(DWELLING_MAILING_ADDRESS_LABEL);
    expect(html).toContain('data-ff-dwelling-fire="0"');
    expect(html).toContain("Mailing address same as insured address");
  });
});

describe("DP1/DP3 policy mailing line", () => {
  it("keeps the owner mailing when it differs from the rental premises", () => {
    const premises = mailingAddressLine({
      address: rental.street,
      city: rental.city,
      state: rental.state,
      zip: rental.zip,
    });
    const mailing = mailingAddressLine({
      address: home.street,
      city: home.city,
      state: home.state,
      zip: home.zip,
    });
    expect(distinctMailingLabel({ premises, mailing })).toBe(mailing);
    expect(isDwellingFireProduct("DP3", "DP3")).toBe(true);
  });

  it("hides a duplicate mailing and does not treat HO3 as dwelling fire", () => {
    const premises = mailingAddressLine({
      address: "12 Oak St",
      city: "Palm Bay",
      state: "FL",
      zip: "32909",
    });
    expect(distinctMailingLabel({ premises, mailing: premises })).toBeNull();
    expect(isDwellingFireProduct("HO3")).toBe(false);
  });
});
