import { describe, expect, it } from "vitest";
import { fieldsForLine, groupFields } from "./catalog";
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

  it("workers comp lean Risk Profile includes class codes and owner inclusion", () => {
    const fields = fieldsForLine("workers_comp");
    expect(fields.some((f) => f.key === "coverage_lines")).toBe(true);
    expect(fields.some((f) => f.key === "class_code")).toBe(true);
    expect(fields.some((f) => f.key === "owners_included")).toBe(true);
    expect(fields.some((f) => f.key === "claims_last_5_years")).toBe(true);
    const visible = groupFields("workers_comp", undefined, { coverage_lines: "Workers' Comp" });
    expect(visible.some((group) => group.group === "Workers' Comp")).toBe(true);
  });

  it("GL lean Risk Profile cascades from coverage chips", () => {
    const fields = fieldsForLine("general_liability");
    expect(fields.find((f) => f.key === "customer_type")?.options).toContain("B2B");
    expect(fields.some((f) => f.key === "products_services")).toBe(true);
    const hidden = groupFields("general_liability", undefined, { coverage_lines: "Workers' Comp" });
    expect(hidden.some((group) => group.group === "General Liability")).toBe(false);
  });

  it("BOP is its own shop line and only shows the BOP block when BOP is checked", () => {
    expect(isShopLine("bop")).toBe(true);
    expect(productsForLine("bop")).toEqual(["bop"]);
    const fields = fieldsForLine("bop", "bop");
    expect(fields.some((f) => f.key === "bpp_limit")).toBe(true);
    expect(fields.some((f) => f.key === "building_limit")).toBe(true);
    expect(fields.find((f) => f.key === "construction_type")?.options).toEqual(
      expect.arrayContaining(["Frame", "Masonry", "Steel", "Concrete"]),
    );
    const without = groupFields("bop", "bop", { coverage_lines: "General Liability" });
    expect(without.some((group) => group.group === "BOP")).toBe(false);
    const withBop = groupFields("bop", "bop", { coverage_lines: "BOP" });
    expect(withBop.some((group) => group.group === "BOP")).toBe(true);
  });
});
