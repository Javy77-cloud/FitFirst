import { describe, expect, it } from "vitest";
import {
  coerceDealUploadDocType,
  matchDealLookup,
  partyLabel,
  slotForDocType,
  suggestDealLookup,
} from "./lookup";

const rows = [
  { id: "d-elena", title: "Ruiz · Melbourne HO3", partyName: "Ruiz, Elena", email: "elena@example.com", phone: "321-555-0101" },
  { id: "d-ana", title: "Dib · Palm Bay HO3", partyName: "Dib, Ana" },
  { id: "d-harbor", title: "Harbor Key Marine · GL", partyName: "Harbor Key Marine LLC" },
  { id: "d-javy", title: "HO3 shop", partyName: "Rivera, Javy", email: "javy@fitfirst.local", phone: "(321) 555-0140" },
  { id: "d-zoho", title: "Imported shop", partyName: null, email: null, phone: undefined },
];

describe("deal lookup", () => {
  it("prefers an explicit deal id", () => {
    expect(matchDealLookup(rows, "anything", "d-ana")?.title).toBe("Dib · Palm Bay HO3");
  });

  it("autofills from a unique person or business name", () => {
    expect(matchDealLookup(rows, "Elena")?.id).toBe("d-elena");
    expect(matchDealLookup(rows, "harbor key marine llc")?.id).toBe("d-harbor");
  });

  it("does not guess when the name is ambiguous", () => {
    expect(matchDealLookup(rows, "HO3")).toBeNull();
  });

  it("requires a deal name — empty query does not attach", () => {
    expect(matchDealLookup(rows, "   ")).toBeNull();
  });

  it("builds a person or business label", () => {
    expect(partyLabel({ contact: { firstName: "Elena", lastName: "Ruiz" } })).toBe("Ruiz, Elena");
    expect(partyLabel({ account: { name: "Harbor Key Marine LLC" } })).toBe("Harbor Key Marine LLC");
  });

  it("suggests matching titles for the picker", () => {
    expect(suggestDealLookup(rows, "dib").map((r) => r.id)).toEqual(["d-ana"]);
  });

  it("pulls Javy from the linked contact name, email, or phone as you type", () => {
    expect(suggestDealLookup(rows, "javy").map((r) => r.id)).toEqual(["d-javy"]);
    expect(suggestDealLookup(rows, "FITFIRST.local").map((r) => r.id)).toEqual(["d-javy"]);
    expect(matchDealLookup(rows, "5550140")?.id).toBe("d-javy");
  });

  it("does not throw on Zoho-imported null party fields", () => {
    expect(partyLabel({ contact: { firstName: "", lastName: null } })).toBeNull();
    expect(suggestDealLookup(rows, "imported").map((r) => r.id)).toEqual(["d-zoho"]);
  });
});

describe("deal upload slots", () => {
  it("routes signed apps and quotes to their own slots", () => {
    expect(slotForDocType("signed_app")).toBe("signed_app");
    expect(slotForDocType("quote")).toBe("quote_pdf");
    expect(slotForDocType("proposal")).toBe("proposal");
    expect(slotForDocType("four_point")).toBe("source_doc");
    expect(slotForDocType("current_policy")).toBe("source_doc");
  });

  it("keeps unknown types as other", () => {
    expect(coerceDealUploadDocType("permits")).toBe("permits");
    expect(coerceDealUploadDocType("mystery")).toBe("other");
  });
});
