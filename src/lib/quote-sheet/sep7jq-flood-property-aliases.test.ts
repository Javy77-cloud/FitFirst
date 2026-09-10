import { describe, expect, it } from "vitest";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";

describe("sep7jq Flood property API aliases", () => {
  it("maps Home property keys onto Flood sheet keys", () => {
    expect(extractKeyToSheetKey("flood", "construction")).toBe("construction_type");
    expect(extractKeyToSheetKey("flood", "square_feet")).toBe("building_sqft");
    expect(extractKeyToSheetKey("flood", "stories")).toBe("number_of_floors");
    expect(extractKeyToSheetKey("flood", "living_area")).toBe("building_sqft");
  });

  it("keeps Home keys unchanged on Home", () => {
    expect(extractKeyToSheetKey("home", "construction")).toBe("construction");
    expect(extractKeyToSheetKey("home", "square_feet")).toBe("square_feet");
    expect(extractKeyToSheetKey("home", "stories")).toBe("stories");
  });

  it("Flood construction_type has extractKey construction for property facts", () => {
    const field = fieldsForLine("flood").find((f) => f.key === "construction_type");
    expect(field?.extractKey).toBe("construction");
  });
});
