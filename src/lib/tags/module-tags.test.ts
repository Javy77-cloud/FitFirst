import { describe, expect, it } from "vitest";
import {
  SUGGESTED_MODULE_TAGS,
  carryLeadTagsToContact,
  mergeTags,
  normalizeTags,
} from "./module-tags";

describe("per-module tags", () => {
  it("keeps suggested defaults per module", () => {
    expect(SUGGESTED_MODULE_TAGS.leads).toContain("referral");
    expect(SUGGESTED_MODULE_TAGS.contacts).toContain("client");
    expect(SUGGESTED_MODULE_TAGS.deals).toContain("shopping");
    expect(SUGGESTED_MODULE_TAGS.policies).toContain("renewal");
  });

  it("carries sensible lead tags onto a contact", () => {
    expect(carryLeadTagsToContact(["Hot", "Referral", "VIP"])).toEqual(["referral", "vip"]);
    expect(normalizeTags(["  Multi Line ", "multi-line", ""])).toEqual(["multi-line"]);
    expect(mergeTags(["client"], ["referral", "client"])).toEqual(["client", "referral"]);
  });
});
