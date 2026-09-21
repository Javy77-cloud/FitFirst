import { describe, expect, it } from "vitest";
import { applyManualPriority, sanitizePriorityPins } from "./priority-pins";

const cards = [
  { id: "hot" },
  { id: "cooling" },
  { id: "cold" },
  { id: "near" },
];

describe("manual priority pins", () => {
  it("floats 1–8 to the top in pin order and leaves everyone else in system order", () => {
    expect(applyManualPriority(cards, { cold: 1, cooling: 2 }).map((card) => card.id)).toEqual([
      "cold",
      "cooling",
      "hot",
      "near",
    ]);
  });

  it("sinks 9–10 under the natural hot/cold order", () => {
    expect(applyManualPriority(cards, { hot: 9, near: 10, cold: 1 }).map((card) => card.id)).toEqual([
      "cold",
      "cooling",
      "hot",
      "near",
    ]);
  });

  it("restores system sort when the pin is cleared", () => {
    const pinned = { cold: 1, hot: 9 };
    expect(applyManualPriority(cards, pinned).map((card) => card.id)).toEqual(["cold", "cooling", "near", "hot"]);
    expect(applyManualPriority(cards, {}).map((card) => card.id)).toEqual(["hot", "cooling", "cold", "near"]);
    expect(applyManualPriority(cards, sanitizePriorityPins({ cold: 0, hot: "nope", cooling: 3 }))).toEqual([
      cards[1],
      cards[0],
      cards[2],
      cards[3],
    ]);
  });
});
