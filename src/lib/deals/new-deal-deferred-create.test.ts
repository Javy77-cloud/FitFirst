import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  forceNewShopOnSave,
  mergeNewDealFormValues,
  newDealCreateHref,
  packageDraftForNewDealSave,
  parseNewDealSearchParams,
  shopLinesForNewDealSave,
} from "./new-deal-href";

const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const DEAL_ID = "22222222-2222-4222-8222-222222222222";

function formFrom(entries: Record<string, string | string[]>) {
  return {
    get(name: string) {
      const value = entries[name];
      if (Array.isArray(value)) return value[0] ?? "";
      return value ?? "";
    },
    getAll(name: string) {
      const value = entries[name];
      if (value == null) return [];
      return Array.isArray(value) ? value : [value];
    },
  };
}

describe("Add New Deal defers insert until Save", () => {
  it("builds /deals/new query params instead of allocating a deal id", () => {
    expect(newDealCreateHref({ shopLines: ["home"] })).toBe(
      "/deals/new?shopLines=homeowners&shopProducts=homeowners",
    );
    expect(newDealCreateHref({ shopLines: ["flood", "auto", "home"] })).toBe(
      "/deals/new?shopLines=homeowners&shopProducts=homeowners&shopLines=auto&shopProducts=auto&shopLines=flood&shopProducts=flood",
    );
    expect(
      newDealCreateHref({
        shopLines: ["auto"],
        contactId: CONTACT_ID,
        sourceDealId: DEAL_ID,
      }),
    ).toBe(
      `/deals/new?shopLines=auto&shopProducts=auto&contactId=${CONTACT_ID}&sourceDealId=${DEAL_ID}`,
    );
    expect(newDealCreateHref({ contactId: "not-a-uuid" })).toBe(
      "/deals/new?shopLines=homeowners&shopProducts=homeowners",
    );
  });

  it("parses create-form query params including repeated shopLines", () => {
    expect(
      parseNewDealSearchParams({
        shopLines: ["auto", "flood"],
        contactId: CONTACT_ID,
        sourceDealId: DEAL_ID,
      }),
    ).toEqual({
      shopLines: ["auto", "flood"],
      contactId: CONTACT_ID,
      sourceDealId: DEAL_ID,
    });
    expect(parseNewDealSearchParams({ shopLines: "home,auto" })).toEqual({
      shopLines: ["homeowners", "auto"],
      contactId: null,
      sourceDealId: null,
    });
  });

  it("create dialog does not insert — it only routes to /deals/new", () => {
    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(dialog).toMatch(/router\.push\(href\)/);
    expect(dialog).toMatch(/searchDealsForCreate/);
    expect(dialog).toMatch(/ProductPicker/);
    expect(dialog).not.toMatch(/createDealFromScratch/);
    expect(dialog).not.toMatch(/createDealFromExistingPick/);
    expect(dialog).not.toMatch(/createDealFromSourceDeal/);
    expect(dialog).not.toMatch(/result\.href/);
    expect(dialog).not.toMatch(/\.insert\(/);
  });

  it("desk Add Deal, contact Add Deal, and /deals/new entry do not insert", () => {
    const desk = readFileSync("src/lib/desk/quick-actions.ts", "utf8");
    const menu = readFileSync("src/lib/desk/create-menu.ts", "utf8");
    const contact = readFileSync("src/components/contacts/contact-deal-rows.tsx", "utf8");
    const page = readFileSync("src/app/deals/new/page.tsx", "utf8");
    const seed = readFileSync("src/lib/deals/new-deal-seed.ts", "utf8");
    const href = readFileSync("src/lib/deals/new-deal-href.ts", "utf8");
    const scratch = readFileSync("src/app/actions/deal-create.ts", "utf8");
    expect(desk).toMatch(/href: "\/deals\/new"/);
    expect(menu).toMatch(/href: "\/deals\/new"/);
    expect(contact).toMatch(/href=\{`\/deals\/new\?contactId=\$\{contactId\}`\}/);
    expect(page).not.toMatch(/\.insert\(/);
    expect(page).not.toMatch(/createDealFromScratch/);
    expect(page).toMatch(/createDeal/);
    expect(page).toMatch(/Save Deal/);
    expect(seed).not.toMatch(/\.insert\(/);
    expect(href).not.toMatch(/\.insert\(/);
    expect(href).toMatch(/packageCreateDraft/);
    const scratchFn = scratch.slice(
      scratch.indexOf("export async function createDealFromScratch"),
      scratch.indexOf("export async function createDealFromScratchAction"),
    );
    expect(scratchFn).toMatch(/newDealCreateHref/);
    expect(scratchFn).not.toMatch(/\.insert\(/);
    expect(scratchFn).not.toMatch(/New Shop/);
  });

  it("Save Deal on /deals/new creates the durable deal with package lines", () => {
    const page = readFileSync("src/app/deals/new/page.tsx", "utf8");
    expect(page).toMatch(/createDeal/);
    expect(page).toMatch(/Save Deal/);
    expect(page).toMatch(/NewDealCreateFields/);
    expect(page).toMatch(/parseNewDealSearchParams/);
    expect(page).toMatch(/loadNewDealFormSeed/);
    expect(page).toMatch(/defaultContactId/);
    expect(page).toMatch(/Back To Deals/);
    const fields = readFileSync("src/components/deals/new-deal-create-fields.tsx", "utf8");
    expect(fields).toMatch(/intent/);
    expect(fields).toMatch(/new-shop/);
    expect(fields).toMatch(/sourceDealId/);
    expect(fields).toMatch(/ProductPicker/);
    const save = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(save).toMatch(/export async function createDeal/);
    expect(save).toMatch(/packageDraftForNewDealSave/);
    expect(save).toMatch(/forceNewShopOnSave/);
    expect(save).toMatch(/shopLines,/);
    expect(save).toMatch(/insertSheetsForDeal\(deal\.id, shopLines\)/);
    expect(save).toMatch(/if \(lead\.convertedDealId && !forceNewShop\)/);
  });

  it("Save uses checked package lines and does not reopen a converted deal", () => {
    const form = formFrom({
      intent: "new-shop",
      shopLines: ["home", "auto", "flood"],
      contactId: CONTACT_ID,
    });
    expect(forceNewShopOnSave(form)).toBe(true);
    expect(shopLinesForNewDealSave(form)).toEqual(["homeowners", "auto", "flood"]);
    expect(packageDraftForNewDealSave(form)).toMatchObject({
      shopLines: ["home", "auto", "flood"],
      products: ["homeowners", "auto", "flood"],
      quotingLine: "home",
      quotingForm: "HO3",
      lineOfBusiness: "HO",
    });
    expect(forceNewShopOnSave(formFrom({}))).toBe(false);
    expect(shopLinesForNewDealSave(formFrom({}))).toBeUndefined();
    expect(packageDraftForNewDealSave(formFrom({ shopLines: ["auto"] }))?.quotingForm).toBe("PA");
  });

  it("merges copied contact/deal values onto the empty create layout", () => {
    expect(
      mergeNewDealFormValues({ first_name: "", last_name: "", notes: "" }, { first_name: "Elena" }),
    ).toEqual({ first_name: "Elena", last_name: "", notes: "" });
  });
});
