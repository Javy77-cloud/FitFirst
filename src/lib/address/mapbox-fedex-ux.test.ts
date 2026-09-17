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

  it("shows Verify address + chips on the shared control without FedEx typeahead copy", () => {
    const ui = source("src/components/address-autocomplete.tsx");
    expect(ui).toMatch(/Verify address/);
    expect(ui).toMatch(/data-ff-address-verify/);
    expect(ui).toMatch(/Verified/);
    expect(ui).toMatch(/Suggested correction/);
    expect(ui).toMatch(/\/api\/address\/verify/);
    expect(ui).toMatch(/\/api\/address\/suggest/);
    expect(ui).not.toMatch(/Looking up FedEx/);
    expect(ui).not.toMatch(/fedex typeahead/i);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/property_address/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/applicant_address/);
    expect(source("src/components/deal/quote-sheet-form.tsx")).toMatch(/ONE_LINE_SHEET_ADDRESS/);
  });

  it("does not touch Rosa mint, notices, or deals list notes", () => {
    expect(source("src/lib/policy/mint-gate.ts")).toMatch(/evaluateMintExtract|mintConfirmQueue|mailing_address/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/DealNotices|notice/);
    expect(source("src/lib/deals/product-stages.ts")).toMatch(/Per-product pipeline-list notes/);
  });
});
