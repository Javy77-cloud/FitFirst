import { describe, expect, it } from "vitest";
import {
  campaignsReady,
  connectedCampaignIntegrations,
  paidVendorsAllowed,
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
    tone: "campaign",
    connected,
    accountLabel: connected ? "stub" : null,
    lastConnectStatus: connected ? "not_implemented" : null,
    ownerUserId: null,
    clientId: null,
    hasCredentials: false,
    connectMode: connected ? "demo" : null,
    lastOauthError: null,
    hasEnvCredentials: false,
    hasRefreshToken: false,
    tokenAccountEmail: null,
  };
}

describe("campaign / SMS readiness", () => {
  it("keeps paid campaign and SMS vendors off this desk", () => {
    expect(paidVendorsAllowed()).toBe(false);
    const items = [
      item("gmail", "email", true),
      item("mailchimp", "campaigns", true),
      item("sendgrid", "campaigns", true),
      item("twilio", "phone_sms", true),
    ];
    expect(campaignsReady(items)).toBe(false);
    expect(smsReady(items, true)).toBe(false);
    expect(connectedCampaignIntegrations(items).map((row) => row.id)).toContain("sendgrid");
  });
});
