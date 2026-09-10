import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";

describe("Auto effective_date on master sheet (sep7jb / Gaya standing)", () => {
  it("fieldsForLine(auto) includes effective_date and expiration_date in Current policy", () => {
    const fields = fieldsForLine("auto");
    const effective = fields.find((f) => f.key === "effective_date");
    expect(effective).toBeDefined();
    expect(effective?.label).toBe("Effective date");
    expect(effective?.group).toBe("Current policy");
    expect(effective?.extractKey).toBe("effective_date");

    const expiration = fields.find((f) => f.key === "expiration_date");
    expect(expiration).toBeDefined();
    expect(expiration?.label).toBe("Expiration date");
    expect(expiration?.group).toBe("Current policy");
  });
});
