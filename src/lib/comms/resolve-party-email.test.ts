import { describe, expect, it } from "vitest";
import { resolvePartyEmail } from "./resolve-party-email";

describe("resolvePartyEmail", () => {
  it("prefers contact, then lead, then account", () => {
    expect(
      resolvePartyEmail({
        contact: { email: "c@x.com" },
        lead: { email: "l@x.com" },
        account: { email: "a@x.com" },
      }),
    ).toBe("c@x.com");
    expect(
      resolvePartyEmail({
        contact: { email: "  " },
        lead: { email: "l@x.com" },
        account: { email: "a@x.com" },
      }),
    ).toBe("l@x.com");
    expect(
      resolvePartyEmail({
        contact: null,
        lead: { email: null },
        account: { email: "a@x.com" },
      }),
    ).toBe("a@x.com");
    expect(resolvePartyEmail({ contact: null, lead: null, account: null })).toBeNull();
  });
});
