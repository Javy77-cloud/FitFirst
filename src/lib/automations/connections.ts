import type { CatalogItem } from "@/lib/integrations/catalog-store";

const CAMPAIGN_PROVIDERS = new Set(["mailchimp", "constant_contact", "sendgrid"]);
const SMS_PROVIDERS = new Set(["twilio", "ringcentral", "lightspeed_voice"]);

export function campaignIntegrations(items: CatalogItem[]) {
  return items.filter((item) => item.category === "campaigns" || CAMPAIGN_PROVIDERS.has(item.id));
}

export function connectedCampaignIntegrations(items: CatalogItem[]) {
  return campaignIntegrations(items).filter((item) => item.connected);
}

export function smsIntegrations(items: CatalogItem[]) {
  return items.filter((item) => item.category === "phone_sms" || SMS_PROVIDERS.has(item.id));
}

export function connectedSmsIntegrations(items: CatalogItem[]) {
  return smsIntegrations(items).filter((item) => item.connected);
}

export function campaignsReady(items: CatalogItem[]) {
  return connectedCampaignIntegrations(items).length > 0;
}

export function smsReady(items: CatalogItem[], smsConnected: boolean) {
  return smsConnected || connectedSmsIntegrations(items).length > 0;
}
