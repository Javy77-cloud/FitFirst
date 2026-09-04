import {
  CONTACT_ID,
  ELENA_CONTACT_ID,
  ELENA_PORTAL_TOKEN,
  ELENA_PORTAL_TOKEN_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_CONTACT_ID,
  HARBOR_PORTAL_TOKEN,
  HARBOR_PORTAL_TOKEN_ID,
  TENANT_ID,
} from "@/lib/fixtures/ids";
import { db } from "./index";
import { portalTokens } from "./schema";

export async function seedClientPortal() {
  if (ELENA_CONTACT_ID === CONTACT_ID) {
    throw new Error("Client portal seed must not attach to Ana.");
  }

  await db
    .insert(portalTokens)
    .values({
      id: ELENA_PORTAL_TOKEN_ID,
      tenantId: TENANT_ID,
      token: ELENA_PORTAL_TOKEN,
      label: "Elena Ruiz · personal",
      kind: "personal",
      contactId: ELENA_CONTACT_ID,
      accountId: null,
    })
    .onConflictDoUpdate({
      target: portalTokens.id,
      set: {
        token: ELENA_PORTAL_TOKEN,
        label: "Elena Ruiz · personal",
        kind: "personal",
        contactId: ELENA_CONTACT_ID,
        accountId: null,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(portalTokens)
    .values({
      id: HARBOR_PORTAL_TOKEN_ID,
      tenantId: TENANT_ID,
      token: HARBOR_PORTAL_TOKEN,
      label: "Harbor Key Marine LLC · commercial",
      kind: "commercial",
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
    })
    .onConflictDoUpdate({
      target: portalTokens.id,
      set: {
        token: HARBOR_PORTAL_TOKEN,
        label: "Harbor Key Marine LLC · commercial",
        kind: "commercial",
        contactId: HARBOR_CONTACT_ID,
        accountId: HARBOR_ACCOUNT_ID,
        updatedAt: new Date(),
      },
    });
}
