import { describe, expect, it } from "vitest";
import { hubPaths, hubSurface } from "./paths";

describe("hub paths", () => {
  it("keeps Settings and Automations on the same records, different chrome", () => {
    expect(hubSurface("automations")).toBe("automations");
    expect(hubSurface("")).toBe("settings");
    expect(hubPaths("automations").functions).toBe("/automations/functions");
    expect(hubPaths("settings").functions).toBe("/settings/developer/functions");
    expect(hubPaths("automations").function("abc")).toBe("/automations/functions/abc");
  });
});
