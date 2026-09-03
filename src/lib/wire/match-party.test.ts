import { describe, expect, it } from "vitest";
import { accountFieldsFromSheet, contactFieldsFromSheet, isSameAccount, isSameContact } from "./match-party";

describe("party match", () => {
  it("does not duplicate a contact on a second bind of the same person", () => {
    const elena = {
      firstName: "Elena",
      lastName: "Ruiz",
      email: "elena.ruiz@example.com",
      phone: "(321) 555-0188",
    };
    expect(isSameContact(elena, { ...elena, phone: "3215550188" })).toBe(true);
    expect(isSameContact(elena, { firstName: "Elena", lastName: "Ruiz" })).toBe(false);
  });

  it("matches a business by EIN, not a similar name", () => {
    expect(
      isSameAccount(
        { name: "Harbor Key Marine LLC", ein: "59-1234567" },
        { name: "Harbor Key Marine", ein: "591234567" },
      ),
    ).toBe(true);
    expect(
      isSameAccount(
        { name: "Harbor Key Marine LLC", ein: "59-1234567" },
        { name: "Harbor Key Marine LLC", ein: "98-0000000" },
      ),
    ).toBe(false);
  });

  it("lets the same person keep a personal Contact and a linked Business", () => {
    const contact = contactFieldsFromSheet(
      { address1: { value: "412 Harbor Isle Dr" }, city: { value: "Melbourne" } },
      { firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@example.com" },
    );
    const business = accountFieldsFromSheet(
      { address1: { value: "412 Harbor Isle Dr" } },
      { name: "Ruiz Tile LLC", ein: "59-7654321" },
    );
    expect(contact.lastName).toBe("Ruiz");
    expect(business.name).toBe("Ruiz Tile LLC");
    expect(contact.mailingAddress).toBe(business.mailingAddress);
  });
});
