import { describe, expect, it } from "vitest";
import { moduleTitleFromPath, recordSubtitle } from "./module-title";

describe("moduleTitleFromPath", () => {
  it("matches list and record routes to the nav module", () => {
    expect(moduleTitleFromPath("/")).toBe("Home");
    expect(moduleTitleFromPath("/pipeline?pipeline=p-c")).toBe("Pipeline");
    expect(moduleTitleFromPath("/leads")).toBe("Leads");
    expect(moduleTitleFromPath("/leads/new")).toBe("Leads");
    expect(moduleTitleFromPath("/contacts/abc")).toBe("Contacts");
    expect(moduleTitleFromPath("/deals")).toBe("Deals");
    expect(moduleTitleFromPath("/deals/xyz")).toBe("Deals");
    expect(moduleTitleFromPath("/policies/p1")).toBe("Policies");
    expect(moduleTitleFromPath("/documents")).toBe("Documents");
    expect(moduleTitleFromPath("/accounts/1")).toBe("Businesses");
    expect(moduleTitleFromPath("/businesses/1")).toBe("Businesses");
    expect(moduleTitleFromPath("/search?q=Elena")).toBe("Search");
    expect(moduleTitleFromPath("/alerts")).toBe("Alerts");
    expect(moduleTitleFromPath("/phone")).toBe("Phone");
    expect(moduleTitleFromPath("/settings/my-desk")).toBe("Settings");
    expect(moduleTitleFromPath("/quotes")).toBe("Quotes");
    expect(moduleTitleFromPath("/meetings/new")).toBe("Calendar");
    expect(moduleTitleFromPath("/commissions")).toBe("Commissions");
    expect(moduleTitleFromPath("/commissions/agents/maya")).toBe("Commissions");
  });

  it("keeps a record name as subtitle when it differs from the module", () => {
    expect(recordSubtitle("Contacts", "Ruiz, Elena")).toBe("Ruiz, Elena");
    expect(recordSubtitle("Home", "Home")).toBeNull();
    expect(recordSubtitle("Pipeline", "P&C pipeline")).toBe("P&C pipeline");
  });
});
