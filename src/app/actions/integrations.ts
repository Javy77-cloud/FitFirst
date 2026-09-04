"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID, INTEGRATION_CATALOG } from "@/lib/domain";
import { db } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { notImplemented } from "@/lib/integrations/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

function catalogEntry(category: string, provider: string) {
  return INTEGRATION_CATALOG.find((item) => item.category === category && item.provider === provider);
}

export async function connectIntegrationStub(formData: FormData) {
  await assertAdmin();
  const category = str(formData, "category");
  const provider = str(formData, "provider");
  const entry = catalogEntry(category, provider);
  if (!entry) throw new Error("Unknown connector.");
  const stub = notImplemented(`${entry.label} connect`);
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.category, category),
        eq(integrationConnections.provider, provider),
      ),
    );
  const patch = {
    connected: true,
    displayLabel: entry.label,
    notes: "BYO stub. Agency connects later. No credentials stored. FitFirst does not buy Twilio.",
    lastStatus: stub.status,
    connectedAt: new Date(),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(integrationConnections).set(patch).where(eq(integrationConnections.id, existing.id));
  } else {
    await db.insert(integrationConnections).values({
      tenantId: DEFAULT_TENANT_ID,
      category,
      provider,
      ...patch,
    });
  }
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  redirect(`/settings/integrations?notice=stub-connected&provider=${provider}`);
}

export async function disconnectIntegrationStub(formData: FormData) {
  await assertAdmin();
  const category = str(formData, "category");
  const provider = str(formData, "provider");
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.category, category),
        eq(integrationConnections.provider, provider),
      ),
    );
  if (existing) {
    await db
      .update(integrationConnections)
      .set({
        connected: false,
        lastStatus: "disconnected",
        connectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));
  }
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  redirect(`/settings/integrations?notice=stub-disconnected&provider=${provider}`);
}
