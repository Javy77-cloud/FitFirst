import { describe, expect, it } from "vitest";
import { withNoneOption, withNoneStringOption } from "./select-options";

describe("withNoneOption", () => {
  it("prepends None when missing", () => {
    expect(withNoneOption([{ value: "a", label: "A" }])).toEqual([
      { value: "", label: "None" },
      { value: "a", label: "A" },
    ]);
  });
  it("does not duplicate empty", () => {
    expect(withNoneOption([{ value: "", label: "Clear" }, { value: "a", label: "A" }])[0].label).toBe("Clear");
  });
  it("string helper prepends empty", () => {
    expect(withNoneStringOption(["HO", "AUTO"])).toEqual(["", "HO", "AUTO"]);
  });
});
