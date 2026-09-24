import { describe, expect, it } from "vitest";
import {
  businessPanelIdForSection,
  businessTabFromSection,
  parseBusinessTab,
  businessSectionMatchesActiveTab,
} from "./business-tabs";

describe("business tabs URL", () => {
  it("defaults to glance and maps details/section aliases", () => {
    expect(parseBusinessTab(undefined, undefined)).toBe("glance");
    expect(parseBusinessTab("details", null)).toBe("details");
    expect(parseBusinessTab(null, "coverage")).toBe("coverage");
    expect(parseBusinessTab("business-details", null)).toBe("details");
    expect(parseBusinessTab("at-a-glance", null)).toBe("glance");
    expect(parseBusinessTab(null, "emails")).toBe("communications");
    expect(parseBusinessTab("opportunities", null)).toBe("opportunities");
  });

  it("maps section ids to panel tabs including communications collapse", () => {
    expect(businessTabFromSection("at-a-glance")).toBe("glance");
    expect(businessTabFromSection("business-details")).toBe("details");
    expect(businessPanelIdForSection("sms")).toBe("communications");
    expect(businessSectionMatchesActiveTab("meetings", "communications")).toBe(true);
    expect(businessSectionMatchesActiveTab("policies", "policies")).toBe(true);
    expect(businessSectionMatchesActiveTab("policies", "deals")).toBe(false);
  });
});
