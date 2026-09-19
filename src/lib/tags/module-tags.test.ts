import { describe, expect, it } from "vitest";
import {
  SUGGESTED_MODULE_TAGS,
  TAG_MODULES,
  carryLeadTagsToContact,
  formatTagLabel,
  mergeTags,
  normalizeTags,
  tagModuleForList,
  tagModuleLabel,
  tagSortText,
} from "./module-tags";

describe("per-module tags", () => {
  it("keeps suggested defaults per module", () => {
    expect(TAG_MODULES).toContain("accounts");
    expect(TAG_MODULES).toContain("carriers");
    expect(TAG_MODULES).toContain("tasks");
    expect(tagModuleLabel("accounts")).toBe("Accounts");
    expect(tagModuleForList("leads")).toBe("leads");
    expect(tagModuleForList("leads-queue")).toBe("leads");
    expect(SUGGESTED_MODULE_TAGS.leads).toContain("referral");
    expect(SUGGESTED_MODULE_TAGS.contacts).toContain("client");
    expect(SUGGESTED_MODULE_TAGS.deals).toContain("shopping");
    expect(SUGGESTED_MODULE_TAGS.accounts).toContain("commercial");
    expect(SUGGESTED_MODULE_TAGS.policies).toContain("renewal");
    expect(SUGGESTED_MODULE_TAGS.carriers).toContain("preferred");
    expect(SUGGESTED_MODULE_TAGS.tasks).toContain("follow-up");
    expect(tagModuleForList("tasks")).toBe("tasks");
    expect(tagModuleLabel("tasks")).toBe("Tasks");
  });

  it("carries sensible lead tags onto a contact", () => {
    expect(carryLeadTagsToContact(["Hot", "Referral", "VIP"])).toEqual(["referral", "vip"]);
    expect(normalizeTags(["  Multi Line ", "multi-line", ""])).toEqual(["multi-line"]);
    expect(mergeTags(["client"], ["referral", "client"])).toEqual(["client", "referral"]);
  });

  it("formats tag sort text the same way chips display (SSR = CSR)", () => {
    expect(formatTagLabel("high-risk")).toBe("High Risk");
    expect(tagSortText(["High Risk"])).toBe("High Risk");
    expect(tagSortText(["high-risk", "urgent"])).toBe("High Risk Urgent");
    expect(tagSortText([])).toBe("");
    expect(tagSortText(null)).toBe("");
  });
});
