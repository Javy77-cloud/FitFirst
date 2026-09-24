import { describe, expect, it } from "vitest";
import { namedInsuredsMatch, normalizeNamedInsured } from "./named-insured";

describe("normalizeNamedInsured", () => {
  it("turns LAST FIRST and LAST, FIRST into First Last", () => {
    expect(normalizeNamedInsured("IORI DOMENIC")).toBe("Domenic Iori");
    expect(normalizeNamedInsured("IORI, DOMENIC")).toBe("Domenic Iori");
    expect(normalizeNamedInsured("DE LA CRUZ, MARIA")).toBe("Maria De La Cruz");
  });

  it("does not reorder a mixed-case name or a three-token all-caps line", () => {
    expect(normalizeNamedInsured("Domenic M Iori")).toBe("Domenic M Iori");
    expect(normalizeNamedInsured("MARIA DE LA CRUZ")).toBe("Maria De La Cruz");
  });

  it("matches a deal name after normalization", () => {
    expect(namedInsuredsMatch("IORI, DOMENIC", "Domenic Iori")).toBe(true);
    expect(namedInsuredsMatch("IORI DOMENIC", "Jane Doe")).toBe(false);
  });
});
