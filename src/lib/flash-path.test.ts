import { describe, expect, it } from "vitest";
import { hrefPathname, isSamePageHref, requestPathname } from "./flash-path";

describe("flash path", () => {
  it("compares dest href to the current page without query or hash", () => {
    expect(hrefPathname("/settings/esign?flash=credentials-saved#docusign")).toBe("/settings/esign");
    expect(hrefPathname("https://fit-first-seven.vercel.app/settings/esign?x=1")).toBe(
      "/settings/esign",
    );
    expect(isSamePageHref("/settings/esign", "/settings/esign#docusign")).toBe(true);
    expect(isSamePageHref("/settings/esign", "/settings/integrations")).toBe(false);
    expect(isSamePageHref(null, "/settings/esign")).toBe(false);
  });

  it("reads Next.js next-url then Referer", () => {
    expect(
      requestPathname({
        get: (name) => (name === "next-url" ? "/settings/esign?flash=x" : "/other"),
      }),
    ).toBe("/settings/esign");
    expect(
      requestPathname({
        get: (name) => (name === "referer" ? "https://desk.local/settings/lists" : null),
      }),
    ).toBe("/settings/lists");
  });
});
