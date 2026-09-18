import { describe, expect, it } from "vitest";
import { contactDobHealPatch, dobFromLinkedDeals, secondaryPropertyAddressCue } from "./heal-contact-from-deals";

describe("heal contact from linked deals", () => {
  it("heals a blank Contact DOB from a linked deal and never overwrites", () => {
    const deals = [
      {
        dealId: "deal-rosa",
        values: { date_of_birth: "03/22/1965", mailing_address: "18025 Cypress Point Road" },
        quotingForm: "DP3",
        product: "DP3",
        insuredAddress: "18025 Cypress Point Road",
      },
    ];
    expect(dobFromLinkedDeals(deals)).toBe("1965-03-22");
    expect(contactDobHealPatch("", deals)).toEqual({ date_of_birth: "1965-03-22" });
    expect(contactDobHealPatch("1960-01-02", deals)).toBeNull();
    expect(contactDobHealPatch("", [{ dealId: "x", values: {} }])).toBeNull();
  });

  it("cues when Contact address matches a DP3 / rental insured location", () => {
    const cue = secondaryPropertyAddressCue({
      contactAddress: "18025 Cypress Point Road",
      deals: [
        {
          dealId: "deal-rosa",
          values: { mailing_address: "18025 Cypress Point Road" },
          quotingForm: "DP3",
          product: "DP3",
          insuredAddress: "18025 Cypress Point Road",
        },
      ],
    });
    expect(cue).toMatchObject({
      dealId: "deal-rosa",
      insuredAddress: "18025 Cypress Point Road",
      kind: "secondary",
    });
    expect(
      secondaryPropertyAddressCue({
        contactAddress: "8561 SW 85th St Ave",
        deals: [
          {
            dealId: "deal-rosa",
            values: { mailing_address: "18025 Cypress Point Road" },
            quotingForm: "DP3",
            product: "DP3",
            insuredAddress: "18025 Cypress Point Road",
          },
        ],
      }),
    ).toBeNull();
  });
});
