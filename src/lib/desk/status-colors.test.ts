import { describe, expect, it } from "vitest";
import {
  clientStatusColor,
  defaultStageColor,
  displayStatusLabel,
  policyStatusColor,
  stageColorFromNameOrSlug,
  statusColorClass,
} from "./status-colors";

describe("stage colors", () => {
  it("assigns a calm default per known slug and otherwise by order", () => {
    expect(defaultStageColor(0, "gather")).toBe("blue");
    expect(defaultStageColor(1, "quotes")).toBe("teal");
    expect(defaultStageColor(2, "review")).toBe("amber");
    expect(defaultStageColor(3, "quote_sent")).toBe("violet");
    expect(defaultStageColor(4, "closed_won")).toBe("green");
    expect(defaultStageColor(5, "closed_lost")).toBe("rose");
    expect(defaultStageColor(0, "archive")).toBe("slate");
    expect(defaultStageColor(7, "custom_uw")).toBe("teal");
  });

  it("keeps a persisted color and still colors Gather Info from the name", () => {
    expect(stageColorFromNameOrSlug("Gather Info", "green")).toBe("green");
    expect(stageColorFromNameOrSlug("Quote Sent")).toBe("violet");
    expect(stageColorFromNameOrSlug("Meet / Quotes")).toBe("teal");
    expect(stageColorFromNameOrSlug("Gather Info")).toBe("blue");
    expect(stageColorFromNameOrSlug("Closed Won")).toBe("green");
    expect(stageColorFromNameOrSlug("ARCHIVE")).toBe("slate");
  });
});

describe("policy and client status colors", () => {
  it("gives each policy picklist status a distinct color", () => {
    expect(policyStatusColor("Active")).toBe("green");
    expect(policyStatusColor("inactive")).toBe("slate");
    expect(policyStatusColor("bound")).toBe("orange");
    expect(policyStatusColor("pending")).toBe("amber");
    expect(policyStatusColor("lapse")).toBe("rose");
    expect(policyStatusColor("cancellation")).toBe("rose");
    expect(policyStatusColor("non_renewal")).toBe("violet");
    expect(policyStatusColor("expired")).toBe("slate");
    expect(new Set(["active", "inactive", "bound", "pending", "lapse", "non_renewal"].map(policyStatusColor)).size).toBe(
      6,
    );
  });

  it("colors Client, Former Client, and Prospect / Lead", () => {
    expect(clientStatusColor("client")).toBe("green");
    expect(clientStatusColor("former_client")).toBe("orange");
    expect(clientStatusColor("not_a_client")).toBe("slate");
    expect(clientStatusColor("prospect")).toBe("blue");
    expect(clientStatusColor("lead")).toBe("teal");
    expect(displayStatusLabel("former_client")).toBe("Former Client");
    expect(displayStatusLabel("non_renewal")).toBe("Non-renewal");
  });

  it("returns accessible light-UI classes, never neon solids", () => {
    const cls = statusColorClass("green");
    expect(cls).toContain("bg-[");
    expect(cls).not.toMatch(/bg-(emerald|red)-600/);
  });
});
