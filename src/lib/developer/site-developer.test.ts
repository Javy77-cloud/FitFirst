import { describe, expect, it } from "vitest";
import { userIsSiteDeveloper } from "./site-developer";

describe("site developer flag", () => {
  it("does not treat Admin as a site developer", () => {
    expect(
      userIsSiteDeveloper({ email: "javy@fitfirst.local", isSiteDeveloper: false }, { FF_SITE_DEVELOPER_EMAILS: "" }),
    ).toBe(false);
  });

  it("honors the users.is_site_developer column", () => {
    expect(userIsSiteDeveloper({ email: "maya@fitfirst.local", isSiteDeveloper: true }, {})).toBe(true);
  });

  it("honors FF_SITE_DEVELOPER_EMAILS without a seed wipe", () => {
    expect(
      userIsSiteDeveloper(
        { email: "javy@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(true);
    expect(
      userIsSiteDeveloper(
        { email: "maya@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(false);
  });
});
