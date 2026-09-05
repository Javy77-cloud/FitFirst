import { describe, expect, it } from "vitest";
import { isShopLine, parseShopLine } from "@/lib/domain";

describe("shop line parse", () => {
  it("keeps Home and other desk lines", () => {
    expect(parseShopLine("home")).toBe("home");
    expect(parseShopLine("auto")).toBe("auto");
    expect(parseShopLine("general_liability")).toBe("general_liability");
    expect(isShopLine("home")).toBe(true);
  });

  it("falls back to Home for junk or Master Risk leftovers", () => {
    expect(parseShopLine("risk")).toBe("home");
    expect(parseShopLine("master-risk")).toBe("home");
    expect(parseShopLine(undefined)).toBe("home");
    expect(isShopLine("risk")).toBe(false);
  });
});
