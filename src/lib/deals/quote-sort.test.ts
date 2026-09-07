import { describe, expect, it } from "vitest";
import { sortQuotesCheapestFirst } from "./quote-sort";

describe("sortQuotesCheapestFirst", () => {
  it("puts the cheapest priced quote first and sinks blanks", () => {
    const rows = sortQuotesCheapestFirst([
      { id: "c", premium: "5607.53" },
      { id: "a", premium: null },
      { id: "b", premium: "2100" },
      { id: "d", premium: "" },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["b", "c", "a", "d"]);
  });
});
