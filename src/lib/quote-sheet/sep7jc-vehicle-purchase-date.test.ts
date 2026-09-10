import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";

describe("Auto vehicle_purchase_date on master sheet (sep7jc / Gaya standing)", () => {
  it("fieldsForLine(auto) includes vehicle_purchase_date in Vehicle group", () => {
    const fields = fieldsForLine("auto");
    const field = fields.find((f) => f.key === "vehicle_purchase_date");
    expect(field).toBeDefined();
    expect(field?.label).toBe("Purchase date");
    expect(field?.group).toBe("Vehicle");
  });
});
