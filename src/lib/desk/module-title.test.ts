import { describe, expect, it } from "vitest";
import { moduleTitleFromPath, recordSubtitle } from "./module-title";

describe("moduleTitleFromPath", () => {
  it("matches list and record routes to the nav module", () => {
    expect(moduleTitleFromPath("/")).toBe("Dashboard");
    expect(moduleTitleFromPath("/pipeline?pipeline=p-c")).toBe("Deals");
    expect(moduleTitleFromPath("/leads")).toBe("Leads");
    expect(moduleTitleFromPath("/leads/new")).toBe("Leads");
    expect(moduleTitleFromPath("/contacts/abc")).toBe("Contacts");
    expect(moduleTitleFromPath("/deals")).toBe("Deals");
    expect(moduleTitleFromPath("/deals/xyz")).toBe("Deals");
    expect(moduleTitleFromPath("/policies/p1")).toBe("Policies");
    expect(moduleTitleFromPath("/documents")).toBe("Documents");
    expect(moduleTitleFromPath("/accounts/1")).toBe("Accounts");
    expect(moduleTitleFromPath("/businesses/1")).toBe("Accounts");
    expect(moduleTitleFromPath("/search?q=Elena")).toBe("Search");
    expect(moduleTitleFromPath("/alerts")).toBe("Alerts");
    expect(moduleTitleFromPath("/notifications")).toBe("Notification board");
    expect(moduleTitleFromPath("/inbox")).toBe("Inbox");
    expect(moduleTitleFromPath("/phone")).toBe("Phone");
    expect(moduleTitleFromPath("/settings/my-desk")).toBe("Settings");
    expect(moduleTitleFromPath("/quotes")).toBe("Quotes");
    expect(moduleTitleFromPath("/scorecards")).toBe("Scorecards");
    expect(moduleTitleFromPath("/scorecards/abc")).toBe("Scorecards");
    expect(moduleTitleFromPath("/glance?tab=claims")).toBe("Glance");
    expect(moduleTitleFromPath("/meetings/new")).toBe("Calendar");
    expect(moduleTitleFromPath("/compliance")).toBe("Compliance");
    expect(moduleTitleFromPath("/commissions")).toBe("Commissions");
    expect(moduleTitleFromPath("/commissions/agents/maya")).toBe("Commissions");
  });

  it("keeps a record name as subtitle when it differs from the module", () => {
    expect(recordSubtitle("Contacts", "Ruiz, Elena")).toBe("Ruiz, Elena");
    expect(recordSubtitle("Dashboard", "Dashboard")).toBeNull();
    expect(recordSubtitle("Deals", "P&C pipeline")).toBe("P&C pipeline");
  });
});
