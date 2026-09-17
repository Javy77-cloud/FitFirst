import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddressAutocomplete } from "@/components/address-autocomplete";

describe("Verify address button-first control", () => {
  it("shows an outline Verify address button with quiet auto off", () => {
    const html = renderToStaticMarkup(
      createElement(AddressAutocomplete, { name: "mailing_address" }),
    );
    expect(html).toMatch(/data-ff-address-verify=/);
    expect(html).toMatch(/Verify address/);
    expect(html).toMatch(/data-ff-address-quiet-verify="0"/);
    expect(html).toMatch(/border-navy/);
    expect(html).not.toMatch(/data-ff-address-verify-chip="confirmed"/);
  });

  it("hides Verify on mailing when same-as-insured skipVerify is set", () => {
    const html = renderToStaticMarkup(
      createElement(AddressAutocomplete, {
        name: "contact_mailing_address",
        skipVerify: true,
      }),
    );
    expect(html).not.toMatch(/data-ff-address-verify=/);
    expect(html).not.toMatch(/Verify address/);
    expect(html).toMatch(/data-ff-address-quiet-verify="0"/);
  });
});
