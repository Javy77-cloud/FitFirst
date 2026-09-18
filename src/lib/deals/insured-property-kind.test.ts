import { describe, expect, it } from "vitest";
import {
  INSURED_PROPERTY_KIND_KEY,
  INSURED_PROPERTY_KIND_PRIMARY,
  INSURED_PROPERTY_KIND_SECONDARY,
  contactAddressMatchesSecondaryProperty,
  defaultInsuredPropertyKind,
  ensureInsuredPropertyKindInLayout,
  omitHomeAddressIfNotPrimary,
  parseInsuredPropertyKind,
  resolveInsuredPropertyKind,
} from "./insured-property-kind";

describe("insured property kind", () => {
  it("defaults HO3 / owner-occupied to primary and DP3 / landlord to rental", () => {
    expect(defaultInsuredPropertyKind({ product: "HO3", quotingForm: "HO3" })).toBe("primary");
    expect(defaultInsuredPropertyKind({ product: "homeowners" })).toBe("primary");
    expect(defaultInsuredPropertyKind({ occupancy: "owner" })).toBe("primary");
    expect(defaultInsuredPropertyKind({ product: "DP3", quotingForm: "DP3" })).toBe("secondary");
    expect(defaultInsuredPropertyKind({ product: "landlord" })).toBe("secondary");
    expect(defaultInsuredPropertyKind({ sheetUsage: "Rental" })).toBe("secondary");
    expect(defaultInsuredPropertyKind({ occupancy: "tenant" })).toBe("secondary");
    expect(defaultInsuredPropertyKind({ product: "auto" })).toBeNull();
  });

  it("prefers a stored override over product inference", () => {
    expect(
      resolveInsuredPropertyKind({
        stored: INSURED_PROPERTY_KIND_SECONDARY,
        product: "HO3",
      }),
    ).toBe("secondary");
    expect(parseInsuredPropertyKind("Primary residence")).toBe("primary");
    expect(parseInsuredPropertyKind("Rental / secondary")).toBe("secondary");
  });

  it("gates Contact home copy to primary residence only", () => {
    const incoming = {
      mailing_address: "18025 Cypress Point Road",
      city: "Fort Myers",
      state: "FL",
      zip: "33912",
      email: "rosa@example.com",
    };
    expect(omitHomeAddressIfNotPrimary(incoming, "primary").mailing_address).toBe(
      "18025 Cypress Point Road",
    );
    expect(omitHomeAddressIfNotPrimary(incoming, "secondary")).toEqual({
      email: "rosa@example.com",
    });
    expect(omitHomeAddressIfNotPrimary(incoming, null)).toEqual({
      email: "rosa@example.com",
    });
  });

  it("flags when Contact home matches a rental / secondary insured location", () => {
    expect(
      contactAddressMatchesSecondaryProperty({
        contactAddress: "18025 Cypress Point Rd",
        insuredAddress: "18025 Cypress Point Road",
        kind: "secondary",
      }),
    ).toBe(true);
    expect(
      contactAddressMatchesSecondaryProperty({
        contactAddress: "8561 SW 85th St Ave",
        insuredAddress: "18025 Cypress Point Road",
        kind: "secondary",
      }),
    ).toBe(false);
    expect(
      contactAddressMatchesSecondaryProperty({
        contactAddress: "18025 Cypress Point Road",
        insuredAddress: "18025 Cypress Point Road",
        kind: "primary",
      }),
    ).toBe(false);
  });

  it("inserts the control after Insured Address on Deal Details layouts", () => {
    const layout = ensureInsuredPropertyKindInLayout({
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "insured_address",
              label: "Insured Address",
              fieldKeys: ["mailing_address", "city", "state", "zip"],
            },
          ],
        },
        { id: "right", sections: [] },
      ],
    });
    expect(layout.columns[0].sections[0]?.fieldKeys).toEqual([
      "mailing_address",
      INSURED_PROPERTY_KIND_KEY,
      "city",
      "state",
      "zip",
    ]);
    expect(INSURED_PROPERTY_KIND_PRIMARY).toBe("Primary residence");
    expect(INSURED_PROPERTY_KIND_SECONDARY).toBe("Rental / secondary");
  });
});
