import { eq } from "drizzle-orm";
import { hashToken } from "@/lib/auth/token-crypto";
import { demoTokenPlaintext } from "@/lib/auth/api";
import { ADMIN_USER_ID, DEMO_API_TOKEN_ID, TENANT_ID } from "@/lib/fixtures/ids";
import { db } from "./index";
import { apiTokens } from "./schema";

export async function seedApiTokens() {
  const tokenHash = hashToken(demoTokenPlaintext());
  const [existing] = await db.select().from(apiTokens).where(eq(apiTokens.id, DEMO_API_TOKEN_ID));
  if (existing) {
    await db
      .update(apiTokens)
      .set({
        tenantId: TENANT_ID,
        userId: ADMIN_USER_ID,
        tokenHash,
        label: "demo admin",
        expiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(apiTokens.id, DEMO_API_TOKEN_ID));
    return;
  }
  await db.insert(apiTokens).values({
    id: DEMO_API_TOKEN_ID,
    tenantId: TENANT_ID,
    userId: ADMIN_USER_ID,
    tokenHash,
    label: "demo admin",
    expiresAt: null,
  });
}
