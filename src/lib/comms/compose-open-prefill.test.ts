import { describe, expect, it } from "vitest";
import {
  composeOpenHasRecordContext,
  composeOpenPrefillFromParty,
} from "./compose-open-prefill";

describe("composeOpenPrefillFromParty", () => {
  it("fills To from Deal Details CF email when contact/lead/account are empty (Catherine)", () => {
    expect(
      composeOpenPrefillFromParty({
        contact: null,
        lead: { email: null, firstName: "Catherine", lastName: "Garcia" },
        account: null,
        deal: { title: "Catherine Garcia / MHO", primaryNamedInsured: "Catherine Garcia" },
        dealStored: { email: "catherine.cg557@gmail.com" },
      }),
    ).toEqual({
      email: "catherine.cg557@gmail.com",
      name: "Catherine Garcia",
    });
  });

  it("fills To from deal CF only when no contact/lead/account (Gloria)", () => {
    expect(
      composeOpenPrefillFromParty({
        contact: null,
        lead: null,
        account: null,
        deal: { title: "Gloria Martinez / HO3", primaryNamedInsured: "Gloria Martinez" },
        dealStored: { email: "edmersonv@gmail.com" },
      }),
    ).toEqual({
      email: "edmersonv@gmail.com",
      name: "Gloria Martinez",
    });
  });

  it("still prefers contact email over deal CF (Rosa)", () => {
    expect(
      composeOpenPrefillFromParty({
        contact: { email: "rlcastellanos@yahoo.com", firstName: "Rosa", lastName: "Castellanos" },
        lead: null,
        account: null,
        deal: { title: "Rosa Castellanos / HO3", primaryNamedInsured: "Rosa Castellanos" },
        dealStored: { email: "cf-should-not-win@example.com" },
      }),
    ).toEqual({
      email: "rlcastellanos@yahoo.com",
      name: "Rosa Castellanos",
    });
  });

  it("returns null email when nothing is stored (inbox / empty record)", () => {
    expect(
      composeOpenPrefillFromParty({
        contact: null,
        lead: null,
        account: null,
        deal: null,
        dealStored: {},
      }),
    ).toEqual({ email: null, name: null });
  });
});

describe("composeOpenHasRecordContext", () => {
  it("is false for blank Inbox compose and true on a deal", () => {
    expect(composeOpenHasRecordContext({})).toBe(false);
    expect(composeOpenHasRecordContext({ dealId: "c55afeea-2850-486e-99e8-78459056fa88" })).toBe(
      true,
    );
  });
});
