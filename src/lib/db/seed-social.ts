import { AGENT_USER_ID, SOCIAL_CONNECTION_IDS, TENANT_ID } from "../fixtures/ids";
import { db } from "./index";
import { integrationConnections } from "./schema";
import { stubAccountLabel } from "@/lib/integrations/catalog";

const SEEDED_SOCIAL = [
  { id: SOCIAL_CONNECTION_IDS.facebook, provider: "facebook" as const, ownerUserId: null },
  {
    id: SOCIAL_CONNECTION_IDS.instagram,
    provider: "instagram" as const,
    ownerUserId: AGENT_USER_ID,
  },
  {
    id: SOCIAL_CONNECTION_IDS.google_business_profile,
    provider: "google_business_profile" as const,
    ownerUserId: null,
  },
] as const;

/** FB + IG + GBP marked connected. GBP agent monitor stays off until Admin toggles it. */
export async function seedSocialConnectors() {
  const now = new Date();
  for (const row of SEEDED_SOCIAL) {
    await db
      .insert(integrationConnections)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        category: "social",
        provider: row.provider,
        connected: true,
        accountLabel: stubAccountLabel(row.provider),
        notes: "Seeded desk-demo connect. BYO OAuth lives on Settings → Social. Agency pays the vendor.",
        lastConnectStatus: "not_implemented",
        connectMode: "demo",
        connectedAt: now,
        ownerUserId: row.ownerUserId,
      })
      .onConflictDoUpdate({
        target: [
          integrationConnections.tenantId,
          integrationConnections.category,
          integrationConnections.provider,
        ],
        set: {
          category: "social",
          provider: row.provider,
          connected: true,
          accountLabel: stubAccountLabel(row.provider),
          notes: "Seeded desk-demo connect. BYO OAuth lives on Settings → Social. Agency pays the vendor.",
          lastConnectStatus: "not_implemented",
          connectedAt: now,
          ownerUserId: row.ownerUserId,
          updatedAt: now,
        },
      });
  }
}
