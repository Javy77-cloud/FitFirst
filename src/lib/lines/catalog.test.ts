import { describe, expect, it } from "vitest";
import { filterLines, lineBook, linesForBook } from "./catalog";

describe("desk line catalog", () => {
  it("keeps personal and commercial books separate", () => {
    expect(lineBook("HO")).toBe("personal");
    expect(lineBook("GL")).toBe("commercial");
    expect(linesForBook("personal")[0]?.code).toBe("HO");
    expect(linesForBook("commercial")[0]?.code).toBe("GL");
  });

  it("typeaheads most-used lines first and matches code or label", () => {
    const hits = filterLines("personal", "flood");
    expect(hits.map((line) => line.code)).toEqual(["FLOOD"]);
    expect(filterLines("commercial", "work")[0]?.code).toBe("WC");
  });
});
