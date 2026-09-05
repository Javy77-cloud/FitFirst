import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  calendarConnections,
  integrationConnections,
  smsSettings,
  telephonySettings,
} from "@/lib/db/schema";
import { listSendAccounts } from "@/lib/templates/connectors";
import {
  CONNECT_HUB_SECTIONS,
  INTEGRATION_CATEGORIES,
  INTEGRATION_PROVIDERS,
  isFeaturedConnectId,
  type ConnectHubSectionId,
  type IntegrationCategory,
  type IntegrationProvider,
  type IntegrationProviderId,
  stubAccountLabel,
} from "./catalog";

export type CatalogItem = IntegrationProvider & {
  connected: boolean;
  accountLabel: string | null;
  lastConnectStatus: string | null;
  ownerUserId: string | null;
  clientId: string | null;
  hasCredentials: boolean;
  connectMode: string | null;
  lastOauthError: string | null;
};

type LegacyFlags = {
  gmail: boolean;
  outlook: boolean;
  yahoo: boolean;
  zohoMail: boolean;
  googleCalendar: boolean;
  twilioPhone: boolean;
  twilioSms: boolean;
};

async function loadLegacyFlags(): Promise<LegacyFlags> {
  const empty: LegacyFlags = {
    gmail: false,
    outlook: false,
    yahoo: false,
    zohoMail: false,
    googleCalendar: false,
    twilioPhone: false,
    twilioSms: false,
  };
  try {
    const [accounts, calendar, phone, sms] = await Promise.all([
      listSendAccounts(),
      db
        .select()
        .from(calendarConnections)
        .where(
          and(
            eq(calendarConnections.tenantId, DEFAULT_TENANT_ID),
            eq(calendarConnections.provider, "google"),
          ),
        ),
      db
        .select()
        .from(telephonySettings)
        .where(eq(telephonySettings.tenantId, DEFAULT_TENANT_ID)),
      db.select().from(smsSettings).where(eq(smsSettings.tenantId, DEFAULT_TENANT_ID)),
    ]);
    return {
      gmail: accounts.some((row) => row.provider === "google" && row.connected),
      outlook: accounts.some((row) => row.provider === "outlook" && row.connected),
      yahoo: accounts.some((row) => row.provider === "yahoo" && row.connected),
      zohoMail: accounts.some((row) => row.provider === "zoho_mail" && row.connected),
      googleCalendar: Boolean(calendar[0]?.connected),
      twilioPhone: Boolean(phone[0]?.connected && phone[0].provider === "twilio"),
      twilioSms: Boolean(sms[0]?.connected && sms[0].provider === "twilio"),
    };
  } catch {
    return empty;
  }
}

function legacyConnected(id: IntegrationProviderId, flags: LegacyFlags): boolean {
  if (id === "gmail") return flags.gmail;
  if (id === "outlook") return flags.outlook;
  if (id === "yahoo") return flags.yahoo;
  if (id === "zoho_mail") return flags.zohoMail;
  if (id === "google_calendar") return flags.googleCalendar;
  if (id === "twilio") return flags.twilioPhone || flags.twilioSms;
  return false;
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  let stored: (typeof integrationConnections.$inferSelect)[] = [];
  try {
    stored = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.tenantId, DEFAULT_TENANT_ID));
  } catch {
    stored = [];
  }
  const flags = await loadLegacyFlags();
  const byProvider = new Map(
    stored.map((row) => [`${row.category}:${row.provider}`, row] as const),
  );
  const byProviderOnly = new Map(stored.map((row) => [row.provider, row]));

  const items = INTEGRATION_PROVIDERS.map((provider) => {
    const row =
      byProvider.get(`${provider.category}:${provider.id}`) ?? byProviderOnly.get(provider.id);
    const connected = Boolean(row?.connected) || legacyConnected(provider.id, flags);
    const hasOwnSecret = Boolean(row?.clientSecretEnc && row?.clientSecretIv);
    const hasOwnClient = Boolean(row?.clientId?.trim());
    return {
      ...provider,
      connected,
      accountLabel: row?.accountLabel ?? (connected ? stubAccountLabel(provider.id) : null),
      lastConnectStatus: row?.lastConnectStatus ?? (connected ? "not_implemented" : null),
      ownerUserId: row?.ownerUserId ?? null,
      clientId: row?.clientId ?? null,
      hasCredentials: hasOwnClient && hasOwnSecret,
      connectMode: row?.connectMode ?? (connected ? "demo" : null),
      lastOauthError: row?.lastOauthError ?? null,
    };
  });
  const facebook = items.find((item) => item.id === "facebook");
  return items.map((item) => {
    if (item.id !== "instagram" || item.hasCredentials) return item;
    if (!facebook?.hasCredentials) return item;
    return {
      ...item,
      clientId: item.clientId ?? facebook.clientId,
      hasCredentials: true,
    };
  });
}

export async function listCatalogByCategory(): Promise<
  { category: IntegrationCategory; items: CatalogItem[] }[]
> {
  const items = await listCatalogItems();
  return INTEGRATION_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export type ConnectHubSection = {
  id: ConnectHubSectionId;
  title: string;
  blurb: string;
  items: CatalogItem[];
};

export async function listConnectHub(): Promise<{
  featured: ConnectHubSection[];
  more: CatalogItem[];
  items: CatalogItem[];
}> {
  const items = await listCatalogItems();
  const byId = new Map(items.map((item) => [item.id, item]));
  const featured = CONNECT_HUB_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    blurb: section.blurb,
    items: section.providerIds
      .map((id) => byId.get(id))
      .filter((item): item is CatalogItem => Boolean(item)),
  }));
  return {
    featured,
    more: items.filter((item) => !isFeaturedConnectId(item.id)),
    items,
  };
}

export async function upsertCatalogConnection(input: {
  provider: IntegrationProviderId;
  category: IntegrationCategory;
  connected: boolean;
  accountLabel: string | null;
  notes: string | null;
  lastConnectStatus: string | null;
}) {
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.provider, input.provider),
      ),
    );
  const patch = {
    category: input.category,
    connected: input.connected,
    accountLabel: input.accountLabel,
    notes: input.notes,
    lastConnectStatus: input.lastConnectStatus,
    connectMode: input.connected ? "demo" : null,
    connectedAt: input.connected ? new Date() : null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(integrationConnections)
      .set(patch)
      .where(eq(integrationConnections.id, existing.id));
    return;
  }
  await db.insert(integrationConnections).values({
    tenantId: DEFAULT_TENANT_ID,
    provider: input.provider,
    ...patch,
  });
}
