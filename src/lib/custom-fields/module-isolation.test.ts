import { describe, expect, it } from "vitest";
import { parseLayoutModule, requireLayoutModule } from "./modules";

describe("layout module isolation", () => {
  it("parseLayoutModule may default for nav, but requireLayoutModule never guesses deals", () => {
    expect(parseLayoutModule(undefined)).toBe("deals");
    expect(parseLayoutModule("")).toBe("deals");
    expect(parseLayoutModule("leads")).toBe("leads");
    expect(requireLayoutModule("leads")).toBe("leads");
    expect(requireLayoutModule("contacts")).toBe("contacts");
    expect(requireLayoutModule("carriers")).toBe("carriers");
    expect(() => requireLayoutModule(undefined)).toThrow(/required/i);
    expect(() => requireLayoutModule("")).toThrow(/required/i);
    expect(() => requireLayoutModule("not-a-module")).toThrow(/required/i);
  });

  it("saveDealFieldLayout action refuses blank module (source contract)", () => {
    const source = require("node:fs").readFileSync("src/app/actions/custom-fields.ts", "utf8");
    expect(source).toMatch(/requireLayoutModule/);
    expect(source).toMatch(/moduleFrom\(form/);
    // Deals-wide mirror stays deals-gated
    expect(source).toMatch(/if \(module === "deals"\)[\s\S]*saveLayoutForEveryLine/);
  });
});
