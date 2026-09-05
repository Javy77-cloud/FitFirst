import { describe, expect, it } from "vitest";
import {
  matchesPartyQuery,
  partyDisplayName,
  partyHaystack,
  splitTypedPartyName,
  suggestParties,
  type PartyRecord,
} from "./party-typeahead";

const javy: PartyRecord = {
  kind: "contact",
  id: "c-javy",
  firstName: "Javy",
  lastName: "Rivera",
  email: "javy@fitfirst.local",
  phone: "(321) 555-0140",
};

const zohoSparse: PartyRecord = {
  kind: "contact",
  id: "c-zoho",
  firstName: "",
  lastName: "Garcia",
  email: null,
  phone: undefined,
};

const zohoFullInLast: PartyRecord = {
  kind: "contact",
  id: "c-full",
  firstName: null,
  lastName: "Javy Rivera",
  email: "",
  phone: null,
};

const harbor: PartyRecord = {
  kind: "business",
  id: "a-harbor",
  name: "Harbor Key Marine LLC",
  legalName: null,
  dba: "Harbor Key",
  email: "ops@harborkey.example",
  phone: "321-555-2200",
};

const book = [javy, zohoSparse, zohoFullInLast, harbor];

describe("party typeahead", () => {
  it("contains-matches Javy from the contacts book, case-insensitive", () => {
    expect(matchesPartyQuery("jav", javy)).toBe(true);
    expect(matchesPartyQuery("RIVERA", javy)).toBe(true);
    expect(suggestParties(book, "javy").map((hit) => hit.id)).toEqual(["c-full", "c-javy"]);
  });

  it("matches email and phone without a submit click", () => {
    expect(matchesPartyQuery("fitfirst.local", javy)).toBe(true);
    expect(matchesPartyQuery("3215550140", javy)).toBe(true);
    expect(matchesPartyQuery("555-0140", javy)).toBe(true);
    expect(suggestParties(book, "ops@harbor").map((hit) => hit.id)).toEqual(["a-harbor"]);
  });

  it("stays null-safe on Zoho-imported blanks", () => {
    expect(partyDisplayName(zohoSparse)).toBe("Garcia");
    expect(partyDisplayName(zohoFullInLast)).toBe("Javy Rivera");
    expect(partyHaystack(zohoSparse)).toContain("garcia");
    expect(matchesPartyQuery("garcia", zohoSparse)).toBe(true);
    expect(matchesPartyQuery("javy", zohoSparse)).toBe(false);
    expect(() => suggestParties(book, "gar")).not.toThrow();
  });

  it("matches businesses on name, legal name, and DBA", () => {
    expect(matchesPartyQuery("harbor key", harbor)).toBe(true);
    expect(matchesPartyQuery("marine", harbor)).toBe(true);
    expect(suggestParties(book, "KEY").map((hit) => hit.kind)).toEqual(["business"]);
  });

  it("does not suggest until the agent types", () => {
    expect(suggestParties(book, "   ")).toEqual([]);
    expect(suggestParties(book, "")).toEqual([]);
  });

  it("parses a typed Deal Name into first / last", () => {
    expect(splitTypedPartyName("Javy Rivera")).toEqual({ firstName: "Javy", lastName: "Rivera" });
    expect(splitTypedPartyName("Rivera, Javy")).toEqual({ firstName: "Javy", lastName: "Rivera" });
  });
});
