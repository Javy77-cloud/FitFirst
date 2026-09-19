import { describe, expect, it } from "vitest";
import {
  isRetiredPipelinePath,
  remapNavId,
  remapNavIds,
  remapNavPath,
  remapNavSubmenus,
} from "./nav-aliases";

describe("retired Pipeline nav prefs", () => {
  it("maps the Pipeline customize id onto Deals so a saved layout is not orphaned", () => {
    expect(remapNavId("pipeline")).toBe("deals");
    expect(remapNavId("deals")).toBe("deals");
    expect(remapNavIds(["home", "leads", "pipeline", "deals", "contacts"])).toEqual([
      "home",
      "leads",
      "deals",
      "contacts",
    ]);
  });

  it("folds a Pipeline submenu under Deals instead of leaving a dead primary", () => {
    expect(
      remapNavSubmenus({
        pipeline: ["quotes"],
        deals: ["quotes"],
        contacts: ["merge"],
      }),
    ).toEqual({
      deals: ["quotes"],
      contacts: ["merge"],
    });
  });

  it("maps retired Document templates onto Documents", () => {
    expect(remapNavId("document-templates")).toBe("documents");
    expect(remapNavIds(["templates", "document-templates", "documents"])).toEqual([
      "templates",
      "documents",
    ]);
  });

  it("maps retired Tasks nav onto Notifications", () => {
    expect(remapNavId("tasks")).toBe("alerts");
    expect(remapNavIds(["home", "tasks", "calendar", "alerts"])).toEqual([
      "home",
      "alerts",
      "calendar",
    ]);
    expect(remapNavPath("/tasks")).toBe("/notifications");
    expect(remapNavPath("/tasks/abc")).toBe("/notifications");
  });

  it("rewrites leftover /pipeline paths to Deals", () => {
    expect(remapNavPath("/pipeline")).toBe("/deals");
    expect(remapNavPath("/pipeline?pipeline=p-c")).toBe("/deals");
    expect(remapNavPath("/pipeline/abc")).toBe("/deals/abc");
    expect(remapNavPath("/deals")).toBe("/deals");
    expect(isRetiredPipelinePath("/pipeline?pipeline=won-lost")).toBe(true);
    expect(isRetiredPipelinePath("/deals")).toBe(false);
  });
});
