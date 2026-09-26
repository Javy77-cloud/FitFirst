import { describe, expect, it } from "vitest";
import { addressFingerprint } from "./compare";
import {
  addressVerifyFieldKey,
  addressVerifyValuesFromForm,
  metaMatchesAddress,
  parseAddressVerifyMeta,
  serializeAddressVerifyMeta,
  verifyMetaForAddressKey,
  verifyMetaForCurrentAddress,
} from "./verify-state";

const harbor = {
  street: "412 Harbor Isle Dr",
  city: "Melbourne",
  state: "FL",
  zip: "32935",
  county: "",
  country: "US",
};

describe("FedEx address confirmation persist", () => {
  it("round-trips confirmed meta and form hidden fields", () => {
    const meta = {
      status: "confirmed" as const,
      fingerprint: addressFingerprint(harbor),
    };
    expect(parseAddressVerifyMeta(serializeAddressVerifyMeta(meta))).toEqual(meta);
    expect(parseAddressVerifyMeta("1")?.status).toBe("confirmed");
    expect(addressVerifyFieldKey("field_mailing_address")).toBe("mailing_address__verify");
    expect(
      verifyMetaForAddressKey("mailing_address", {
        mailing_address__verify: serializeAddressVerifyMeta(meta),
      }),
    ).toContain("confirmed");
    expect(metaMatchesAddress(meta, harbor)).toBe(true);
    expect(metaMatchesAddress(meta, { ...harbor, zip: "32901" })).toBe(false);
    expect(
      verifyMetaForCurrentAddress("mailing_address", {
        mailing_address: "8944 Adriatico Lane",
        city: "Kissimmee",
        state: "FL",
        zip: "34747",
        mailing_address__verify:
          '{"status":"confirmed","fingerprint":"16021 northwest 79th ct|miami lakes|FL|33016"}',
      }),
    ).toBe("");
    expect(
      verifyMetaForCurrentAddress("mailing_address", {
        mailing_address: harbor.street,
        city: harbor.city,
        state: harbor.state,
        zip: harbor.zip,
        mailing_address__verify: serializeAddressVerifyMeta(meta),
      }),
    ).toContain("confirmed");

    const form = new FormData();
    form.set("field_mailing_address__verify", serializeAddressVerifyMeta(meta));
    form.set("field_contact_mailing_address__confirmed", "1");
    const posted = addressVerifyValuesFromForm(form);
    expect(posted.mailing_address__verify).toContain("confirmed");
    expect(posted.contact_mailing_address__verify).toContain("confirmed");
  });
});
