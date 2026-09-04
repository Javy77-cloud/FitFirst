import { describe, expect, it } from "vitest";
import {
  campaignsReady,
  connectedCampaignIntegrations,
  smsReady,
} from "./connections";
import type { CatalogItem } from "@/lib/integrations/catalog-store";

function item(
  id: CatalogItem["id"],
  category: CatalogItem["category"],
  connected: boolean,
): CatalogItem {
  return {
    id,
    category,
    name: id,
    initials: "X",
    blurb: "",
    byoNote: "",
    connected,
    accountLabel: connected ? "stub" : null,
    lastConnectStatus: connected ? "not_implemented" : null,
    ownerUserId: null,
  };
}

describe("campaign / SMS readiness", () => {
  it("keeps campaigns empty until a campaign vendor is connected", () => {
    const items = [
      item("gmail", "email", true),
      item("mailchimp", "campaigns", false),
      item("sendgrid", "campaigns", false),
    ];
    expect(campaignsReady(items)).toBe(false);
    expect(connectedCampaignIntegrations(items)).toHaveLength(0);
  });

  it("opens campaigns when Mailchimp is stub-connected", () => {
    const items = [item("mailchimp", "campaigns", true), item("twilio", "phone_sms", false)];
    expect(campaignsReady(items)).toBe(true);
  });

  it("treats SMS settings or a phone_sms vendor as ready", () => {
    const items = [item("twilio", "phone_sms", true)];
    expect(smsReady(items, false)).toBe(true);
    expect(smsReady([item("twilio", "phone_sms", false)], true)).toBe(true);
    expect(smsReady([item("twilio", "phone_sms", false)], false)).toBe(false);
  });
});
