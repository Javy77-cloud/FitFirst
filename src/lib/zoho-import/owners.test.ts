import { describe, expect, it } from "vitest";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { extractZohoOwner, resolveOwnerId } from "./owners";

const directory = [
  { id: ADMIN_USER_ID, name: "Javy Rivera", email: "javy@fitfirst.local", role: "admin" },
  { id: AGENT_USER_ID, name: "Maya Chen", email: "maya@fitfirst.local", role: "agent" },
];

describe("Zoho Owner mapping", () => {
  it("reads Owner lookup objects and string emails", () => {
    expect(
      extractZohoOwner({
        Owner: { name: "Maya Chen", id: "z-maya", email: "maya@fitfirst.local" },
      }),
    ).toEqual({ zohoId: "z-maya", name: "Maya Chen", email: "maya@fitfirst.local" });
    expect(extractZohoOwner({ Owner: "javy@fitfirst.local" })).toEqual({
      zohoId: null,
      name: null,
      email: "javy@fitfirst.local",
    });
    expect(extractZohoOwner({ Owner: "Javy Rivera" })).toEqual({
      zohoId: null,
      name: "Javy Rivera",
      email: null,
    });
    expect(extractZohoOwner({ Created_By: { email: "maya@fitfirst.local", name: "Maya Chen" } }, "Created_By").email).toBe(
      "maya@fitfirst.local",
    );
  });

  it("maps Owner email then name, else tenant admin", () => {
    expect(
      resolveOwnerId(
        { zohoId: "z", name: "Someone Else", email: "maya@fitfirst.local" },
        directory,
        ADMIN_USER_ID,
      ),
    ).toBe(AGENT_USER_ID);
    expect(
      resolveOwnerId({ zohoId: null, name: "Javy Rivera", email: null }, directory, ADMIN_USER_ID),
    ).toBe(ADMIN_USER_ID);
    expect(
      resolveOwnerId(
        { zohoId: "z-unknown", name: "Zoho Producer", email: "producer@zoho.test" },
        directory,
        ADMIN_USER_ID,
      ),
    ).toBe(ADMIN_USER_ID);
    expect(resolveOwnerId({ zohoId: null, name: null, email: null }, directory, ADMIN_USER_ID)).toBe(
      ADMIN_USER_ID,
    );
  });
});
