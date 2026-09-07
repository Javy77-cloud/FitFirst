import { afterEach, describe, expect, it } from "vitest";
import { applyPublicToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { allProviderWalls, PROPERTY_ENRICHMENT_ENV, providerWall } from "./providers";
import {
  ADDRESS_CONFIRM_KEYS,
  clearEnrichmentCache,
  enrichPropertyOnAddressConfirm,
} from "./service";

const PREV: Record<string, string | undefined> = {
  ATTOM_API_KEY: process.env.ATTOM_API_KEY,
  ESTATED_API_KEY: process.env.ESTATED_API_KEY,
  FLORIDA_PROPERTY_API_KEY: process.env.FLORIDA_PROPERTY_API_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(PREV)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  clearEnrichmentCache();
});

describe("property enrichment stub", () => {
  it("documents BYO key walls and never scrapes Zillow or county HTML", () => {
    delete process.env.ATTOM_API_KEY;
    delete process.env.ESTATED_API_KEY;
    delete process.env.FLORIDA_PROPERTY_API_KEY;
    const walls = allProviderWalls();
    expect(walls.map((wall) => wall.envVar).sort()).toEqual(
      Object.values(PROPERTY_ENRICHMENT_ENV).sort(),
    );
    expect(walls.every((wall) => wall.status === "needs_key")).toBe(true);
    expect(providerWall("attom").message).toMatch(/ATTOM_API_KEY/);
    expect(providerWall("attom").message).toMatch(/No Zillow/);
    expect(providerWall("florida_property").message).toMatch(/Florida Property API/);
  });

  it("runs on a confirmed Florida address and lands CHECK facts — no Cov A", async () => {
    const result = await enrichPropertyOnAddressConfirm({
      address1: "1098 Adige Ct SE",
      city: "Palm Bay",
      state: "FL",
      zip: "32909",
    });
    expect(result.triggered).toBe(true);
    expect(result.facts.length).toBeGreaterThanOrEqual(8);
    expect(result.facts.some((fact) => fact.fieldKey === "year_built" && fact.value === "1989")).toBe(
      true,
    );
    expect(result.facts.some((fact) => fact.fieldKey === "exterior")).toBe(true);
    expect(result.facts.some((fact) => fact.fieldKey === "roof_covering")).toBe(true);
    expect(result.facts.some((fact) => fact.fieldKey === "coverage_a")).toBe(false);
    expect(result.facts.some((fact) => fact.kind === "zestimate")).toBe(false);
    expect(result.message).toMatch(/No Zillow/);
    expect(result.message).not.toMatch(/zestimate|bcpao/i);

    const applied = applyPublicToSheet("home", emptySheetValues("home"), result.facts);
    expect(applied.values.year_built.status).toBe("check");
    expect(applied.values.year_built.value).toBe("1989");
    expect(applied.values.exterior.status).toBe("check");
    expect(applied.values.roof_covering.status).toBe("check");
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.coverage_a.status).toBe("missing");
  });

  it("skips when the street is blank and names the address-confirm trigger keys", async () => {
    const result = await enrichPropertyOnAddressConfirm({
      address1: "",
      city: "Palm Bay",
      state: "FL",
    });
    expect(result.triggered).toBe(false);
    expect(result.facts).toEqual([]);
    expect([...ADDRESS_CONFIRM_KEYS].sort()).toEqual(["address1", "city", "state", "zip"]);
  });

  it("cross-checks Florida Property against ATTOM and keeps disagreements in review", async () => {
    const result = await enrichPropertyOnAddressConfirm({
      address1: "2140 Tropic Breeze Ave",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
    });
    expect(result.triggered).toBe(true);
    const roof = result.facts.find((fact) => fact.fieldKey === "roof_covering");
    expect(roof?.value).toBe("shingle");
    expect(result.conflicts.some((row) => row.fieldKey === "roof_covering")).toBe(true);
    expect(result.message).toMatch(/Florida/);
  });
});
