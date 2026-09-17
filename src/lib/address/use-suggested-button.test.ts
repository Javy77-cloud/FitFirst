import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddressUseSuggestedButton } from "@/components/address-use-suggested-button";
import {
  ADDRESS_USE_SUGGESTED_LABEL,
  addressSuggestedChoiceClassName,
  addressUseSuggestedButtonClassName,
} from "@/lib/address/use-suggested-button";

describe("Use this address suggested-accept control", () => {
  it("renders a terracotta button labeled Use this address, not a navy underline", () => {
    const html = renderToStaticMarkup(createElement(AddressUseSuggestedButton));
    expect(html).toContain(ADDRESS_USE_SUGGESTED_LABEL);
    expect(html).toMatch(/data-ff-address-use-suggested/);
    expect(html).toContain("ff-terracotta");
    expect(html).toContain("hover:bg-");
    expect(html).toContain("hover:shadow-md");
    expect(html).not.toContain("underline");
    expect(html).not.toContain("text-navy");
    expect(html).not.toContain("Use suggested");
  });

  it("uses FitFirst terracotta, not primary navy, with an obvious hover shift", () => {
    const className = addressUseSuggestedButtonClassName();
    expect(className).toContain("ff-terracotta");
    expect(className).toContain("hover:bg-[color-mix(in_srgb,var(--ff-terracotta)_72%,black)]");
    expect(className).toContain("hover:shadow-md");
    expect(className).not.toContain("bg-primary");
    expect(className).not.toContain("text-navy");
    expect(addressSuggestedChoiceClassName()).toContain("ff-terracotta");
  });

  it("is the accept control on the shared AddressAutocomplete picker", () => {
    const ui = readFileSync("src/components/address-autocomplete.tsx", "utf8");
    expect(ui).toMatch(/AddressUseSuggestedButton/);
    expect(ui).toMatch(/addressSuggestedChoiceClassName/);
    expect(ui).not.toMatch(/>\s*Use suggested\s*</);
  });
});
