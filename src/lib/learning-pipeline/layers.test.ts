import { describe, expect, it } from "vitest";
import { LEARNING_LAYERS } from "./types";
import { createRawTenantStore } from "./raw";
import { anonymizeCorrection } from "./anonymize";
import { createGlobalPoolStore } from "./pool";

describe("three-layer learning pipeline", () => {
  it("keeps raw, anonymize, and global pool as separate modules", () => {
    expect(LEARNING_LAYERS).toEqual(["raw", "anonymize", "global_pool"]);
    expect(createRawTenantStore().layer).toBe("raw");
    expect(createGlobalPoolStore().adminOnly).toBe(true);
    expect(createGlobalPoolStore().layer).toBe("global_pool");
    expect(typeof anonymizeCorrection).toBe("function");
  });
});
