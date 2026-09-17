import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Mapbox typeahead + FedEx verify-only address UX", () => {
  it("uses Mapbox for suggest and never FedEx typeahead", () => {
    const suggest = source("src/app/api/address/suggest/route.ts");
    expect(suggest).toMatch(/suggestMapboxAddresses/);
    expect(suggest).toMatch(/mapboxAutocompleteEnabled/);
    expect(suggest).not.toMatch(/FedEx|fedex|suggestFedExAddresses|loadFedExCredentials/);
    expect(source("src/lib/mapbox/client.ts")).toMatch(/MAPBOX_ACCESS_TOKEN/);
    expect(source("src/lib/mapbox/client.ts")).toMatch(/NEXT_PUBLIC_MAPBOX_TOKEN/);
    expect(source("src/lib/mapbox/client.ts")).not.toMatch(/console\.log/);
    expect(source("src/lib/mapbox/client.ts")).not.toMatch(/console\.info/);
  });

  it("wires FedEx only to the verify POST", () => {
    const verify = source("src/app/api/address/verify/route.ts");
    expect(verify).toMatch(/verifyFedExAddress/);
    expect(verify).toMatch(/export async function POST/);
    expect(verify).toMatch(/export async function GET/);
    expect(verify).toMatch(/status: 405/);
    expect(source("src/app/api/address/status/route.ts")).toMatch(/mapboxAutocompleteEnabled/);
    expect(source("src/app/api/address/status/route.ts")).toMatch(/fedexAddressEnabled/);
    expect(source("src/app/api/address/status/route.ts")).toMatch(/verifyEnabled/);
  });

  it("offers a visible Verify address button and keeps quiet FedEx off by default", () => {
    const ui = source("src/components/address-autocomplete.tsx");
    const rules = source("src/lib/address/verify-run.ts");
    expect(ui).toMatch(/Address confirmed/);
    expect(ui).toMatch(/Address updated/);
    expect(ui).toMatch(/Address entered/);
    expect(ui).toMatch(/Address suggested/);
    expect(ui).toMatch(/data-ff-address-compare/);
    expect(ui).toMatch(/data-ff-address-use-entered/);
    expect(ui).toMatch(/AddressUseSuggestedButton/);
    expect(ui).toMatch(/addressSuggestedChoiceClassName/);
    expect(ui).not.toMatch(/>\s*Use suggested\s*</);
    expect(ui).toMatch(/ADDRESS_VERIFY_UNMATCHED/);
    expect(ui).toMatch(/ADDRESS_VERIFY_UNREACHABLE/);
    expect(ui).toMatch(/ADDRESS_VERIFY_INCOMPLETE/);
    expect(ui).toMatch(/closeSuggestList|suggestListAfterPick/);
    expect(ui).toMatch(/suggestListOnStreetIntent/);
    expect(ui).toMatch(/listActiveRef\.current = next\.listActive|listActiveRef\.current = intent\.listActive/);
    expect(ui).toMatch(/\/api\/address\/verify/);
    expect(ui).toMatch(/\/api\/address\/suggest/);
    expect(ui).toMatch(/listActive/);
    expect(ui).toMatch(/setListActive\(intent\.listActive\)/);
    expect(ui).toMatch(/resolveAddressForVerify/);
    expect(ui).toMatch(/lastFilledRef/);
    expect(ui).toMatch(/autoFocus=\{false\}/);
    expect(ui).toMatch(/Verify address/);
    expect(ui).toMatch(/data-ff-address-verify/);
    expect(ui).toMatch(/data-ff-address-quiet-verify/);
    expect(ui).toMatch(/buttonVariants\(\{ variant: "outline", size: "sm" \}\)/);
    expect(ui).toMatch(/quietVerify = ADDRESS_QUIET_VERIFY_DEFAULT/);
    expect(ui).toMatch(/if \(!quietVerify\) return;/);
    expect(ui).toMatch(/shouldAttemptQuietVerify\(verifyEnabled, quietVerify\)/);
    expect(ui).not.toMatch(/text-\[10px\] font-medium text-navy underline-offset-2 hover:underline disabled:cursor-wait/);
    expect(ui).toMatch(/ADDRESS_VERIFY_NOT_CONFIGURED/);
    expect(rules).toMatch(/Verification isn’t set up/);
    expect(rules).toMatch(/ADDRESS_QUIET_VERIFY_DEFAULT = false/);
    expect(ui).not.toMatch(/Looking up FedEx/);
    expect(ui).not.toMatch(/fedex typeahead/i);
    expect(ui).not.toMatch(/setOpen\(Boolean\(data\.suggestions\?\.length\)\);/);
    expect(ui).toMatch(/shouldOpenSuggestList/);
    expect(ui).toMatch(/shouldFetchAddressSuggestions/);
    expect(ui).toMatch(/shouldHonorStreetIntent/);
    expect(ui).toMatch(/ADDRESS_PICK_INTENT_SUPPRESS_MS/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/property_address/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/applicant_address/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/ONE_LINE_SHEET_ADDRESS/);
  });

  it("does not touch Rosa mint, notices, or deals list notes", () => {
    expect(source("src/lib/policy/mint-gate.ts")).toMatch(/evaluateMintExtract|mintConfirmQueue|mailing_address/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/DealNotices|notice/);
    expect(source("src/lib/deals/product-stages.ts")).toMatch(/Per-product pipeline-list notes/);
  });

  it("applies a Mapbox pick onto insured and mailing field_* siblings via React state", () => {
    const control = source("src/components/custom-fields/field-control.tsx");
    expect(control).toMatch(/addressFillNames\(field\.key, name\)/);
    expect(control).toMatch(/siblingPatchFromAddress/);
    expect(control).toMatch(/onAddressFill/);
    expect(control).toMatch(/onChange=\{onValueChange\}/);
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/onAddressFill=\{\(parts\) => onValuesPatch\?\.\(parts\)\}/);
    expect(panel).toMatch(/function patchValues/);
    const ui = source("src/components/address-autocomplete.tsx");
    expect(ui).toMatch(/mergeParsedAddress/);
    expect(ui).toMatch(/fillScope/);
    expect(ui).toMatch(/setNativeValue/);
    expect(ui).toMatch(/data-ff-address-fill-city/);
    expect(ui).not.toMatch(/form\.querySelector/);
    expect(control).toMatch(/verifyMetaForAddressKey/);
    expect(control).toMatch(/skipVerify/);
    expect(control).toMatch(/isMailingSameAsInsured/);
  });
});
