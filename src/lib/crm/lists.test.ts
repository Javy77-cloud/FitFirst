import { describe, expect, it } from "vitest";
import {
  insuredContactName,
  insuredHref,
  matchesPolicyFilters,
  pcSubfilter,
  policyBook,
  resolveVisibleColumns,
  slugifyStage,
} from "./lists";

describe("resolveVisibleColumns", () => {
  const cols = [
    { id: "deal", defaultVisible: true },
    { id: "stage", defaultVisible: true },
    { id: "line", defaultVisible: true },
    { id: "phone", defaultVisible: false },
    { id: "email", defaultVisible: false },
  ];

  it("opens the default set when nothing is stored", () => {
    expect(resolveVisibleColumns(cols, null)).toEqual(["deal", "stage", "line"]);
  });

  it("respects a persisted picker that adds extra columns", () => {
    expect(resolveVisibleColumns(cols, ["deal", "stage", "line", "phone", "email"])).toEqual([
      "deal",
      "stage",
      "line",
      "phone",
      "email",
    ]);
  });

  it("drops unknown ids and falls back if the picker is empty", () => {
    expect(resolveVisibleColumns(cols, ["nope"])).toEqual(["deal", "stage", "line"]);
  });
});

describe("policy filters", () => {
  it("maps lines into P&C / Life / Health books", () => {
    expect(policyBook("HO")).toBe("pc");
    expect(policyBook("AUTO")).toBe("pc");
    expect(policyBook("GL")).toBe("pc");
    expect(policyBook("LIFE")).toBe("life");
    expect(policyBook("HEALTH")).toBe("health");
  });

  it("subfilters P&C into Home / Auto / Commercial", () => {
    expect(pcSubfilter("HO")).toBe("home");
    expect(pcSubfilter("FLOOD")).toBe("home");
    expect(pcSubfilter("AUTO")).toBe("auto");
    expect(pcSubfilter("GL")).toBe("commercial");
    expect(pcSubfilter("LIFE")).toBe(null);
  });

  it("matches book then P&C subfilter", () => {
    expect(matchesPolicyFilters("HO", "all", "all")).toBe(true);
    expect(matchesPolicyFilters("HO", "pc", "all")).toBe(true);
    expect(matchesPolicyFilters("HO", "pc", "home")).toBe(true);
    expect(matchesPolicyFilters("HO", "pc", "auto")).toBe(false);
    expect(matchesPolicyFilters("LIFE", "pc", "all")).toBe(false);
    expect(matchesPolicyFilters("LIFE", "life", "all")).toBe(true);
    expect(matchesPolicyFilters("GL", "pc", "commercial")).toBe(true);
  });
});

describe("insured / contact name", () => {
  it("prefers named insured, then contact, then lead", () => {
    expect(
      insuredContactName({
        primaryNamedInsured: "Ana Dib",
        contact: { firstName: "Ana", lastName: "Contact" },
        lead: { firstName: "Ana", lastName: "Dib" },
      }),
    ).toBe("Ana Dib");
    expect(
      insuredContactName({
        primaryNamedInsured: null,
        contact: { accountKind: "commercial", legalName: "Coastal Condo LLC", firstName: "Ana", lastName: "Dib" },
        lead: { firstName: "Ana", lastName: "Dib" },
      }),
    ).toBe("Coastal Condo LLC");
    expect(
      insuredContactName({
        primaryNamedInsured: "  ",
        contact: null,
        lead: { firstName: "Ana", lastName: "Dib" },
      }),
    ).toBe("Dib, Ana");
  });

  it("links the contact when present, otherwise the lead, and never a blank party URL", () => {
    expect(insuredHref({ contactId: "c1", leadId: "l1" })).toBe("/contacts/c1");
    expect(insuredHref({ contactId: null, leadId: "l1" })).toBe("/leads/l1");
    expect(insuredHref({ contactId: null, leadId: null })).toBe(null);
  });
});

describe("slugifyStage", () => {
  it("makes a stable slug and does not collide with reserved bound", () => {
    expect(slugifyStage("Quoted — follow up")).toBe("quoted-follow-up");
    expect(slugifyStage("Bound")).toBe("bound-stage");
  });
});
