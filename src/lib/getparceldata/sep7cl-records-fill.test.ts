import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7cl Fill from property records via getparceldata", () => {
  it("keeps property-records Fill wired through the master Fill button", () => {
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/MasterSheetFillButton/);
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/fillFromPropertyRecords/);
    expect(action).toMatch(/runFillFromPropertyRecords/);
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-1",
        line: "home",
        fields: [],
        values: {},
        product: "homeowners",
      }),
    );
    expect(html).toContain("Fill Master Sheet");
  });

  it("wires getparceldata point URL, BYO key, and vault provider", () => {
    const client = source("src/lib/getparceldata/client.ts");
    const key = source("src/lib/getparceldata/key.ts");
    const action = source("src/app/actions/quote-sheet.ts");
    const env = source(".env.example");
    const vault = source("src/lib/developer/vault-public.ts");
    expect(key).toMatch(/https:\/\/api\.getparceldata\.com\/v1\/parcels\/point/);
    expect(client).toMatch(/Authorization: `Bearer/);
    expect(client).toMatch(/geocodePropertyAddress/);
    expect(key).toMatch(/GETPARCELDATA_API_KEY/);
    expect(key).toMatch(/No lookup ran/);
    expect(action).toMatch(/fillFromPropertyRecords/);
    expect(action).toMatch(/orchestratePropertyFill/);
    expect(action).toMatch(/loadGetParcelDataApiKey/);
    expect(action).toMatch(/addressFromSheet/);
    expect(env).toMatch(/GETPARCELDATA_API_KEY=/);
    expect(vault).toMatch(/GETPARCELDATA_VAULT_PROVIDER = "getparceldata"/);
  });

  it("still exposes Parcel ID / Assessed value / Records check on HO", () => {
    const home = fieldsForLine("home", "homeowners");
    expect(home.map((field) => field.key)).toEqual(
      expect.arrayContaining(["parcel_id", "assessed_value", "records_check", "square_feet", "acres", "firm_panel"]),
    );
  });
});
