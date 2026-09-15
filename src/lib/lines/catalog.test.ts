import { describe, expect, it } from "vitest";
import { DESK_LINES, filterLines, lineBook, linesForBook } from "./catalog";

describe("desk line catalog", () => {
  it("keeps personal and commercial books separate using QUOTING_FORMS subtypes", () => {
    expect(lineBook("HO3")).toBe("personal");
    expect(lineBook("DP1")).toBe("personal");
    expect(lineBook("GL")).toBe("commercial");
    expect(lineBook("CA")).toBe("commercial");
    expect(lineBook("MOTORCYCLE")).toBe("personal");
    expect(linesForBook("personal")[0]?.code).toBe("HO3");
    expect(linesForBook("commercial")[0]?.code).toBe("GL");
    expect(DESK_LINES.map((line) => line.code)).toEqual(
      expect.arrayContaining([
        "HO3",
        "DP1",
        "DP3",
        "HO5",
        "HO6",
        "HO8",
        "MHO",
        "MDP",
        "PA",
        "MOTORCYCLE",
        "BOAT",
        "CA",
        "FLOOD",
        "GL",
        "WC",
        "BOP",
      ]),
    );
    expect(DESK_LINES.some((line) => line.label === "Homeowners")).toBe(false);
  });

  it("typeaheads most-used subtypes first and matches code or label", () => {
    const hits = filterLines("personal", "flood");
    expect(hits.map((line) => line.code)).toEqual(["FLOOD"]);
    expect(filterLines("personal", "dp1")[0]?.code).toBe("DP1");
    expect(filterLines("commercial", "work")[0]?.code).toBe("WC");
  });
});
