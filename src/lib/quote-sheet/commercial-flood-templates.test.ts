import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { productsForLine } from "./products";
import { isShopLine } from "@/lib/domain";

describe("Flood / WC / GL / BOP master sheet templates", () => {
  it("flood has NFIP foundation + occupancy picklists", () => {
    const fields = fieldsForLine("flood");
    const foundation = fields.find((f) => f.key === "foundation");
    const occ = fields.find((f) => f.key === "flood_occupancy");
    expect(foundation?.input).toBe("select");
    expect(foundation?.options?.length).toBeGreaterThan(4);
    expect(occ?.options).toContain("Single-family");
    expect(fields.some((f) => f.key === "building_limit")).toBe(true);
    expect(fields.some((f) => f.key === "contents_limit")).toBe(true);
  });

  it("workers comp has ACORD 130–style payroll classes", () => {
    const fields = fieldsForLine("workers_comp");
    expect(fields.some((f) => f.key === "fein")).toBe(true);
    expect(fields.some((f) => f.key === "class_code")).toBe(true);
    expect(fields.some((f) => f.key === "experience_mod")).toBe(true);
    expect(fields.some((f) => f.key === "loss_history")).toBe(true);
  });

  it("GL has limits + claims basis picklists", () => {
    const fields = fieldsForLine("general_liability");
    expect(fields.find((f) => f.key === "claims_basis")?.options).toContain("Occurrence");
    expect(fields.find((f) => f.key === "each_occurrence")?.options).toContain("$1,000,000");
  });

  it("BOP is its own shop line with property + liability", () => {
    expect(isShopLine("bop")).toBe(true);
    expect(productsForLine("bop")).toEqual(["bop"]);
    const fields = fieldsForLine("bop", "bop");
    expect(fields.some((f) => f.key === "bpp_limit")).toBe(true);
    expect(fields.some((f) => f.key === "building_limit")).toBe(true);
    expect(fields.find((f) => f.key === "construction_type")?.options?.length).toBeGreaterThan(3);
  });
});
