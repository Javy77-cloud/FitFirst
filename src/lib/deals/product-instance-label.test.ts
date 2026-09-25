import { describe, expect, it } from "vitest";
import {
  compactStreetLabel,
  labelProductInstances,
  policyFormMenuLabel,
  type ProductInstanceLabelInput,
} from "@/lib/deals/product-instance-label";

function row(partial: Partial<ProductInstanceLabelInput> & Pick<ProductInstanceLabelInput, "key" | "productId">): ProductInstanceLabelInput {
  return partial;
}

describe("product instance labels", () => {
  it("spells a directional and keeps the street name", () => {
    expect(compactStreetLabel("8662 NW 25th St")).toBe("8662 Northwest 25th");
    expect(compactStreetLabel("8662 Northwest")).toBe("8662 Northwest");
    const labels = labelProductInstances([
      row({ key: "homeowners", productId: "homeowners", address: "8662 NW" }),
    ]);
    expect(labels.get("homeowners")).toBe("HO3 8662 Northwest");
  });

  it("keeps a street that has no directional", () => {
    expect(compactStreetLabel("123 Main Street")).toBe("123 Main");
    expect(compactStreetLabel("Flamingo Plaza")).toBe("Flamingo Plaza");
    const labels = labelProductInstances([
      row({ key: "landlord", productId: "landlord", address: "Flamingo Plaza Dr" }),
      row({ key: "flood", productId: "flood", address: "123 Main St" }),
    ]);
    expect(labels.get("landlord")).toBe("DP3 Flamingo Plaza");
    expect(labels.get("flood")).toBe("Flood 123 Main");
  });

  it("drops apartment and unit numbers", () => {
    expect(compactStreetLabel("123 N Main St Apt 4B")).toBe("123 North Main");
    expect(compactStreetLabel("500 SE 2nd Ave Unit 12")).toBe("500 Southeast 2nd");
    expect(compactStreetLabel("88 Ocean Dr #3")).toBe("88 Ocean");
  });

  it("adds the city when two tabs would share a street label", () => {
    const labels = labelProductInstances([
      row({
        key: "homeowners",
        productId: "homeowners",
        address: "8662 Northwest",
        city: "Doral",
      }),
      row({
        key: "homeowners~k7f3a2",
        productId: "homeowners",
        address: "8662 Northwest",
        city: "Miami",
      }),
    ]);
    expect(labels.get("homeowners")).toBe("HO3 8662 Northwest · Doral");
    expect(labels.get("homeowners~k7f3a2")).toBe("HO3 8662 Northwest · Miami");
  });

  it("adds an ordinal when the city still collides", () => {
    const labels = labelProductInstances([
      row({
        key: "homeowners",
        productId: "homeowners",
        address: "8662 Northwest",
        city: "Doral",
      }),
      row({
        key: "homeowners~k7f3a2",
        productId: "homeowners",
        address: "8662 Northwest",
        city: "Doral",
      }),
    ]);
    expect(labels.get("homeowners")).toBe("HO3 8662 Northwest · Doral");
    expect(labels.get("homeowners~k7f3a2")).toBe("HO3 8662 Northwest · Doral · 2");
  });

  it("labels a vehicle with year and make, and +N for the rest", () => {
    const one = labelProductInstances([
      row({
        key: "auto",
        productId: "auto",
        vehicles: [{ year: "2019", make: "Honda" }],
      }),
    ]);
    expect(one.get("auto")).toBe("Auto 2019 Honda");
    const many = labelProductInstances([
      row({
        key: "motorcycle",
        productId: "motorcycle",
        vehicles: [
          { year: "2021", make: "Yamaha" },
          { year: "2018", make: "Honda" },
          { year: "2020", make: "Kawasaki" },
        ],
      }),
    ]);
    expect(many.get("motorcycle")).toBe("Motorcycle 2021 Yamaha +2");
  });

  it("falls back to the product code, and an ordinal only when that code repeats", () => {
    const labels = labelProductInstances([
      row({ key: "homeowners", productId: "homeowners" }),
      row({ key: "homeowners~k7f3a2", productId: "homeowners" }),
      row({ key: "landlord", productId: "landlord" }),
    ]);
    expect(labels.get("homeowners")).toBe("HO3");
    expect(labels.get("homeowners~k7f3a2")).toBe("HO3 · 2");
    expect(labels.get("landlord")).toBe("DP3");
  });

  it("relabels a second HO3 once its own address is present", () => {
    const before = labelProductInstances([
      row({ key: "homeowners", productId: "homeowners", address: "8662 Northwest" }),
      row({ key: "homeowners~k7f3a2", productId: "homeowners" }),
    ]);
    expect(before.get("homeowners")).toBe("HO3 8662 Northwest");
    expect(before.get("homeowners~k7f3a2")).toBe("HO3");
    const after = labelProductInstances([
      row({ key: "homeowners", productId: "homeowners", address: "8662 Northwest" }),
      row({ key: "homeowners~k7f3a2", productId: "homeowners", address: "410 Palm Ave" }),
    ]);
    expect(after.get("homeowners~k7f3a2")).toBe("HO3 410 Palm");
  });

  it("builds a compact policy-form label from the form code and the street start", () => {
    expect(
      policyFormMenuLabel({
        code: "DP3",
        fallback: "DP3",
        address: "10358 Northwest 30th St",
        city: "West Palm Beach",
        state: "FL",
        zip: "33418",
      }),
    ).toBe("DP3 · 10358 Northwest");
    expect(
      policyFormMenuLabel({
        code: "HO3",
        fallback: "HO3",
        address: "8944 Adriatico Ln",
        city: "Kissimmee",
        state: "FL",
        zip: "34747",
      }),
    ).toBe("HO3 · 8944 Adriatico · Kissimmee");
    expect(
      policyFormMenuLabel({
        code: "DP3",
        fallback: "DP3",
        address: "10358 Corporate Blvd",
        city: "Orlando",
        state: "FL",
      }),
    ).toBe("DP3 · 10358 Corporate · Orlando");
    expect(policyFormMenuLabel({ code: "HO3", fallback: "HO3 8944 Adriatico" })).toBe(
      "HO3 8944 Adriatico",
    );
  });
});
