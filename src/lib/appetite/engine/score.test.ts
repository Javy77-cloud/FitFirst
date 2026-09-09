import { describe, expect, it } from "vitest";
import { computePartitionScore, scoreBatchForGraduation } from "./score";

describe("scorePartition graduation logic", () => {
  it("skips portal_closed / incomplete / login_fail", () => {
    const result = computePartitionScore(
      [
        { id: "1", predicted: "green", actualDisposition: "portal_closed", scored: false },
        { id: "2", predicted: "green", actualDisposition: "incomplete", scored: false },
        { id: "3", predicted: "red", actualDisposition: "login_fail", scored: false },
        { id: "4", predicted: "green", actualDisposition: "bindable", scored: false },
      ],
      { priorScoredShops: 0, priorMatched: 0, minSample: 30, accuracyThreshold: 0.9 },
    );
    expect(result.considered).toBe(1);
    expect(result.matched).toBe(1);
    expect(result.skipped).toBe(3);
    expect(result.graduated).toBe(false);
  });

  it("treats floor_only actual as yellow", () => {
    const result = computePartitionScore(
      [
        { id: "1", predicted: "yellow", actualDisposition: "floor_only", scored: false },
        { id: "2", predicted: "green", actualDisposition: "floor_only", scored: false },
      ],
      { priorScoredShops: 0, priorMatched: 0 },
    );
    expect(result.considered).toBe(2);
    expect(result.matched).toBe(1);
  });

  it("graduates when scored>=30 and accuracy>=0.90", () => {
    const predictions = Array.from({ length: 30 }, (_, i) => ({
      predicted: "green" as const,
      actual: i < 27 ? "bindable" : "declined",
    }));
    // 27/30 = 0.9 exactly
    const result = scoreBatchForGraduation(predictions, {
      minSample: 30,
      accuracyThreshold: 0.9,
    });
    expect(result.scoredShops).toBe(30);
    expect(result.accuracyPct).toBeCloseTo(0.9);
    expect(result.graduated).toBe(true);
    expect(result.status).toBe("live");
  });

  it("does not graduate below min_sample even at 100%", () => {
    const predictions = Array.from({ length: 10 }, () => ({
      predicted: "green" as const,
      actual: "bindable",
    }));
    const result = scoreBatchForGraduation(predictions, {
      minSample: 30,
      accuracyThreshold: 0.9,
    });
    expect(result.accuracyPct).toBe(1);
    expect(result.graduated).toBe(false);
    expect(result.status).toBe("shadow");
  });

  it("does not graduate when accuracy below threshold", () => {
    const predictions = Array.from({ length: 30 }, (_, i) => ({
      predicted: "green" as const,
      actual: i < 20 ? "bindable" : "declined",
    }));
    const result = scoreBatchForGraduation(predictions, {
      minSample: 30,
      accuracyThreshold: 0.9,
    });
    expect(result.accuracyPct).toBeCloseTo(20 / 30);
    expect(result.graduated).toBe(false);
  });

  it("accumulates prior scored shops", () => {
    const result = computePartitionScore(
      [
        { id: "1", predicted: "green", actualDisposition: "bindable", scored: false },
        { id: "2", predicted: "green", actualDisposition: "bindable", scored: false },
      ],
      {
        priorScoredShops: 28,
        priorMatched: 26,
        minSample: 30,
        accuracyThreshold: 0.9,
        status: "shadow",
      },
    );
    // 28+2=30 scored; 26+2=28 matched → 28/30 ≈ 0.933
    expect(result.scoredShops).toBe(30);
    expect(result.accuracyPct).toBeCloseTo(28 / 30);
    expect(result.graduated).toBe(true);
  });
});
