import { describe, expect, it } from "vitest";
import { pipelineSlugForLine, shopLineForLob } from "./shop";

describe("pipelineSlugForLine", () => {
  it("routes personal P&C to the p-c board", () => {
    expect(pipelineSlugForLine("HO")).toBe("p-c");
    expect(pipelineSlugForLine("AUTO")).toBe("p-c");
    expect(pipelineSlugForLine("GL")).toBe("p-c");
  });

  it("routes health and life to their boards; Flood stays on P&C", () => {
    expect(pipelineSlugForLine("HEALTH")).toBe("health");
    expect(pipelineSlugForLine("LIFE")).toBe("life");
    expect(pipelineSlugForLine("FLOOD")).toBe("p-c");
    expect(pipelineSlugForLine("NFIP")).toBe("p-c");
  });
});

describe("shopLineForLob", () => {
  it("maps homeowners and auto onto the Quote Sheet line", () => {
    expect(shopLineForLob("HO")).toBe("home");
    expect(shopLineForLob("AUTO")).toBe("auto");
    expect(shopLineForLob("GL")).toBe("general_liability");
  });
});
