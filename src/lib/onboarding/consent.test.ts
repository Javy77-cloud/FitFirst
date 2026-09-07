import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LEARNING_POOL_CONSENT_LIVE_DEFAULT,
  ONBOARDING_CONSENT_DEFAULT,
  ONBOARDING_CONSENT_FIELD,
} from "./index";
import { isLearningPoolConsentLive } from "@/lib/learning-pipeline/flags";

describe("onboarding consent gate", () => {
  it("defaults the checkbox and the live flag to off", () => {
    expect(ONBOARDING_CONSENT_DEFAULT).toBe(false);
    expect(LEARNING_POOL_CONSENT_LIVE_DEFAULT).toBe(false);
    expect(isLearningPoolConsentLive({})).toBe(false);
    expect(ONBOARDING_CONSENT_FIELD).toBe("contributeAnonymizedExtractionData");
  });

  it("keeps the LEGAL todo on the onboarding module", () => {
    const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(src).toContain(
      "// TODO(LEGAL): consent checkbox must be live before first production tenant. Do not enable global pool writes until consent record exists.",
    );
  });
});
