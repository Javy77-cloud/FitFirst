import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { esignSettings } from "@/lib/db/schema";
import { docusignAuthBase } from "./oauth";
import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";

export async function pingDocuSignSandbox(): Promise<{
  email: string | null;
  name: string | null;
  accountName: string | null;
}> {
  const token = await liveAccessToken("docusign");
  if (!token) throw new Error("DocuSign sandbox is not connected.");
  const res = await fetch(`${docusignAuthBase()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const info = (await res.json()) as {
    name?: string;
    email?: string;
    accounts?: { account_name?: string; is_default?: boolean }[];
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(info.error_description || info.error || `DocuSign userinfo failed (${res.status}).`);
  }
  const account = info.accounts?.find((row) => row.is_default) ?? info.accounts?.[0];
  return {
    email: info.email ?? null,
    name: info.name ?? null,
    accountName: account?.account_name ?? null,
  };
}

export async function syncEsignSettingsFromDocuSign(accountLabel: string) {
  const [existing] = await db
    .select()
    .from(esignSettings)
    .where(eq(esignSettings.tenantId, DEFAULT_TENANT_ID));
  const patch = {
    provider: "docusign",
    connected: true,
    accountLabel,
    notes: "DocuSign sandbox OAuth connected. Documents can send envelopes to the deal contact.",
    lastConnectStatus: "byo_oauth",
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(esignSettings).set(patch).where(eq(esignSettings.id, existing.id));
    return;
  }
  await db.insert(esignSettings).values({
    tenantId: DEFAULT_TENANT_ID,
    ...patch,
  });
}

export async function clearEsignSettingsIfDocuSign() {
  const [existing] = await db
    .select()
    .from(esignSettings)
    .where(and(eq(esignSettings.tenantId, DEFAULT_TENANT_ID), eq(esignSettings.provider, "docusign")));
  if (!existing) return;
  await db
    .update(esignSettings)
    .set({
      connected: false,
      lastConnectStatus: null,
      updatedAt: new Date(),
    })
    .where(eq(esignSettings.id, existing.id));
}

export async function docusignIsReady(): Promise<boolean> {
  const row = await loadByoConnection("docusign");
  return Boolean(row?.connected && row.connectMode === "byo");
}
