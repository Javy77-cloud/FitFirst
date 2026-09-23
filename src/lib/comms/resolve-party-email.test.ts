import { describe, expect, it } from "vitest";
import { resolvePartyEmail } from "./resolve-party-email";

describe("resolvePartyEmail", () => {
  it("prefers contact, then lead, then account, then deal CF email", () => {
    expect(
      resolvePartyEmail({
        contact: { email: "c@x.com" },
        lead: { email: "l@x.com" },
        account: { email: "a@x.com" },
        dealStored: { email: "d@x.com" },
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
    expect(
      resolvePartyEmail({
        contact: null,
        lead: null,
        account: null,
        dealStored: { email: "catherine.cg557@gmail.com" },
      }),
    ).toBe("catherine.cg557@gmail.com");
    expect(
      resolvePartyEmail({
        contact: { email: null },
        lead: { email: null },
        account: { email: null },
        dealStored: { applicant_email: "gloria@example.com" },
      }),
    ).toBe("gloria@example.com");
    expect(
      resolvePartyEmail({
        contact: null,
        lead: null,
        account: null,
        dealStored: { co_applicant_email: "co@example.com" },
      }),
    ).toBe("co@example.com");
    expect(resolvePartyEmail({ contact: null, lead: null, account: null })).toBeNull();
  });
});
