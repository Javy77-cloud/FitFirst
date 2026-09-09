import { describe, expect, it } from "vitest";
import { sortQuotesByRatingThenPremium, sortQuotesCheapestFirst } from "./quote-sort";

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

describe("sortQuotesByRatingThenPremium", () => {
  it("floats higher ratings then cheaper premium", () => {
    const rows = sortQuotesByRatingThenPremium([
      { id: "low", premium: "1000", agentRating: 2 },
      { id: "unrated-cheap", premium: "900", agentRating: null },
      { id: "star", premium: "5000", agentRating: 5 },
      { id: "star-cheaper", premium: "4000", agentRating: 5 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["star-cheaper", "star", "low", "unrated-cheap"]);
  });
});
