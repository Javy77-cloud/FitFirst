import { describe, expect, it } from "vitest";
import {
  masterFillDoneSummary,
  masterFillFailureToast,
  masterFillStepsForLine,
  runMasterFillSteps,
} from "./master-fill";

describe("Fill Risk Profile step deadlines", () => {
  it("keeps Docs fills when VIN never resolves and toasts the NHTSA failure", async () => {
    const results = await runMasterFillSteps({
      steps: masterFillStepsForLine("auto"),
      timeoutMsFor: (step) => (step === "vin" ? 30 : 500),
      runStep: async (step) => {
        if (step.id === "deal") return { step: "deal", filledCount: 1, skippedCount: 0 };
        if (step.id === "docs") return { step: "docs", filledCount: 6, skippedCount: 1 };
        return new Promise(() => undefined);
      },
    });

    expect(results.map((step) => step.step)).toEqual(["deal", "docs", "vin"]);
    expect(results[1]?.filledCount).toBe(6);
    expect(results[2]?.error).toMatch(/NHTSA vPIC/);
    expect(results[2]?.error).toMatch(/Fields already filled are saved/);
    expect(masterFillDoneSummary(results)).toMatch(/Filled 7, skipped 1/);
    const toast = masterFillFailureToast(results);
    expect(toast).toMatch(/NHTSA vPIC/);
    expect(toast).toMatch(/Filled 7, skipped 1/);
  });

  it("ends a Docs server action that never resolves instead of spinning", async () => {
    let vinCalled = false;
    const results = await runMasterFillSteps({
      steps: masterFillStepsForLine("auto"),
      timeoutMsFor: (step) => (step === "docs" ? 25 : 500),
      runStep: async (step) => {
        if (step.id === "deal") return { step: "deal", filledCount: 2, skippedCount: 0 };
        if (step.id === "docs") return new Promise(() => undefined);
        vinCalled = true;
        return { step: "vin", filledCount: 1, skippedCount: 0 };
      },
    });

    expect(vinCalled).toBe(false);
    expect(results.find((step) => step.step === "docs")?.error).toMatch(/Docs timed out/);
    expect(masterFillDoneSummary(results)).toMatch(/Filled 2/);
    expect(masterFillFailureToast(results)).toMatch(/Docs timed out/);
    expect(masterFillFailureToast(results)).toMatch(/Filled 2/);
  });

  it("still runs VIN after Docs returns a partial error", async () => {
    const results = await runMasterFillSteps({
      steps: masterFillStepsForLine("auto"),
      timeoutMsFor: () => 500,
      runStep: async (step) => {
        if (step.id === "deal") return { step: "deal", filledCount: 0, skippedCount: 0 };
        if (step.id === "docs") {
          return {
            step: "docs",
            filledCount: 4,
            skippedCount: 0,
            error: "Docs timed out reading this file. Fields already filled are saved.",
          };
        }
        return { step: "vin", filledCount: 3, skippedCount: 0, note: "NHTSA vPIC" };
      },
    });

    expect(results).toHaveLength(3);
    expect(results[2]?.filledCount).toBe(3);
    expect(masterFillDoneSummary(results)).toMatch(/Filled 7/);
    expect(masterFillFailureToast(results)).toMatch(/Fields already filled are saved/);
  });
});
