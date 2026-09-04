import { describe, expect, it } from "vitest";
import {
  insuredContactName,
  insuredHref,
  matchesDealFilters,
  matchesPolicyFilters,
  mailtoHref,
  moveColumn,
  pcSubfilter,
  policyBook,
  resolveColumnLayout,
  resolveVisibleColumns,
  riskAddress,
  slugifyStage,
  telHref,
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

describe("resolveColumnLayout", () => {
  const cols = [
    { id: "deal", defaultVisible: true, hideable: false },
    { id: "stage", defaultVisible: true },
    { id: "line", defaultVisible: true },
    { id: "phone", defaultVisible: false },
  ];

  it("lets the agent override beat the agency default", () => {
    const layout = resolveColumnLayout(cols, {
      agencyIds: ["deal", "stage", "line"],
      agentIds: ["deal", "phone"],
    });
    expect(layout).toEqual({ ids: ["deal", "phone"], source: "agent" });
  });

  it("uses the agency default when the agent has no override", () => {
    const layout = resolveColumnLayout(cols, {
      agencyIds: ["deal", "stage", "phone"],
      agentIds: null,
    });
    expect(layout).toEqual({ ids: ["deal", "stage", "phone"], source: "agency" });
  });

  it("falls back to code defaults", () => {
    expect(resolveColumnLayout(cols, { agencyIds: null, agentIds: null }).source).toBe("code");
  });

  it("keeps required columns even if a saved layout omitted them", () => {
    expect(resolveColumnLayout(cols, { agentIds: ["phone"], agencyIds: null }).ids).toEqual([
      "deal",
      "phone",
    ]);
  });

  it("rearranges a saved order", () => {
    expect(moveColumn(["deal", "stage", "phone"], "phone", -1)).toEqual(["deal", "phone", "stage"]);
  });

  it("promotes new linked columns onto an existing agent layout", () => {
    const cols = [
      { id: "deal", defaultVisible: true, hideable: false },
      { id: "phone", defaultVisible: true, promoteIfMissing: true },
      { id: "email", defaultVisible: true, promoteIfMissing: true },
      { id: "address", defaultVisible: true, promoteIfMissing: true },
      { id: "updated", defaultVisible: false },
    ];
    expect(
      resolveColumnLayout(cols, { agentIds: ["deal", "phone"], agencyIds: null }).ids,
    ).toEqual(["deal", "phone", "email", "address"]);
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
    expect(
      insuredContactName({
        primaryNamedInsured: "  ",
        contact: null,
        lead: { firstName: "Elena", middleName: "M", lastName: "Ruiz" },
      }),
    ).toBe("Ruiz, Elena M");
  });

  it("links the contact when present, otherwise the lead, and never a blank party URL", () => {
    expect(insuredHref({ contactId: "c1", leadId: "l1" })).toBe("/contacts/c1");
    expect(insuredHref({ contactId: null, leadId: "l1" })).toBe("/leads/l1");
    expect(insuredHref({ contactId: null, leadId: null })).toBe(null);
  });
});

describe("list shortcuts", () => {
  it("builds a copyable address and dial/mail links without opening a record", () => {
    expect(
      riskAddress({
        address1: "1098 Adige Ct SE",
        city: "Palm Bay",
        state: "FL",
        zip: "32909",
      }),
    ).toBe("1098 Adige Ct SE · Palm Bay, FL · 32909");
    expect(telHref("(321) 555-0144")).toBe("tel:3215550144");
    expect(mailtoHref("ana@example.com")).toBe("mailto:ana@example.com");
  });

  it("filters shops by stage, line, and a typed query", () => {
    const ana = {
      title: "Dib · Palm Bay HO3",
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      state: "FL",
      insured: "Ana Dib",
      phone: "321-555-0100",
      email: null,
      city: "Palm Bay",
    };
    expect(matchesDealFilters(ana, { stage: "shopping", line: "all" })).toBe(true);
    expect(matchesDealFilters(ana, { stage: "bound" })).toBe(false);
    expect(matchesDealFilters(ana, { q: "palm" })).toBe(true);
    expect(matchesDealFilters(ana, { q: "321-555" })).toBe(true);
    expect(matchesDealFilters(ana, { q: "miami" })).toBe(false);
  });
});

describe("slugifyStage", () => {
  it("makes a stable slug and does not collide with reserved bound", () => {
    expect(slugifyStage("Quoted — follow up")).toBe("quoted-follow-up");
    expect(slugifyStage("Bound")).toBe("bound-stage");
  });
});
