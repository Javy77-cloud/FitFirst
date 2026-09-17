import { and, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret, isMaskedSecretInput } from "@/lib/secrets/vault";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { developerApiVault } from "@/lib/db/schema";
import { publicVaultStatus, type VaultPublicStatus } from "@/lib/developer/vault-public";
import type { SocialPlatformId } from "./platforms";

export const META_VAULT_PROVIDER = "meta";
export const META_VAULT_LABEL = "Meta (Facebook / Instagram)";

export const META_APP_ID_ENV_KEYS = [
  "META_APP_ID",
  "FACEBOOK_APP_ID",
  "META_CLIENT_ID",
  "FACEBOOK_CLIENT_ID",
] as const;

export const META_APP_SECRET_ENV_KEYS = [
  "META_APP_SECRET",
  "FACEBOOK_APP_SECRET",
  "META_CLIENT_SECRET",
  "FACEBOOK_CLIENT_SECRET",
] as const;

export type MetaApp = {
  appId: string;
  appSecret: string;
  source: "env" | "vault";
};

export function isPlatformHostedSocial(id: string): id is "facebook" | "instagram" {
  return id === "facebook" || id === "instagram";
}

export function platformHostedConnectMissingCopy(id: "facebook" | "instagram" | SocialPlatformId): string {
  if (id === "instagram") return "Instagram Connect isn’t set up on this FitFirst install";
  return "Facebook Connect isn’t set up on this FitFirst install";
}

function firstEnv(keys: readonly string[], env: NodeJS.ProcessEnv = process.env): string {
  for (const key of keys) {
    const value = (env[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

/** Sync env-only check. Vault is loaded separately via `loadMetaApp`. */
export function envMetaApp(env: NodeJS.ProcessEnv = process.env): MetaApp | null {
  const appId = firstEnv(META_APP_ID_ENV_KEYS, env);
  const appSecret = firstEnv(META_APP_SECRET_ENV_KEYS, env);
  if (!appId || !appSecret) return null;
  return { appId, appSecret, source: "env" };
}

export function envHasMetaApp(env: NodeJS.ProcessEnv = process.env): boolean {
  return envMetaApp(env) !== null;
}

async function loadMetaVaultRow() {
  try {
    const [row] = await db
      .select()
      .from(developerApiVault)
      .where(
        and(eq(developerApiVault.tenantId, DEFAULT_TENANT_ID), eq(developerApiVault.provider, META_VAULT_PROVIDER)),
      )
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/** Server-only. Never return this object to an agency Admin client. Never log it. */
export async function loadMetaApp(): Promise<MetaApp | null> {
  const row = await loadMetaVaultRow();
  if (row?.configured && row.apiKeyEnc && row.apiKeyIv && row.apiSecretEnc && row.apiSecretIv) {
    try {
      const appId = decryptSecret(row.apiKeyEnc, row.apiKeyIv).trim();
      const appSecret = decryptSecret(row.apiSecretEnc, row.apiSecretIv).trim();
      if (appId && appSecret) return { appId, appSecret, source: "vault" };
    } catch {
      /* fall through to env */
    }
  }
  return envMetaApp();
}

export async function metaAppIsConfigured(): Promise<boolean> {
  return (await loadMetaApp()) !== null;
}

export async function loadMetaPublicStatus(): Promise<VaultPublicStatus> {
  const row = await loadMetaVaultRow();
  if (row?.configured && row.apiKeyEnc && row.apiSecretEnc) {
    return publicVaultStatus({
      configured: true,
      source: "vault",
      provider: META_VAULT_PROVIDER,
      label: META_VAULT_LABEL,
    });
  }
  if (envHasMetaApp()) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      provider: META_VAULT_PROVIDER,
      label: META_VAULT_LABEL,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    provider: META_VAULT_PROVIDER,
    label: META_VAULT_LABEL,
  });
}

export async function saveMetaVault(input: {
  appId: string;
  appSecret: string;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  if (isMaskedSecretInput(input.appId) || isMaskedSecretInput(input.appSecret)) {
    throw new Error("Enter a real Meta App ID and App Secret. Masked values are not saved.");
  }
  const appId = input.appId.trim();
  const appSecret = input.appSecret.trim();
  if (!appId || !appSecret) {
    throw new Error("Meta App ID and App Secret are required.");
  }
  const key = encryptSecret(appId);
  const secret = encryptSecret(appSecret);
  const existing = await loadMetaVaultRow();
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    provider: META_VAULT_PROVIDER,
    label: META_VAULT_LABEL,
    configured: true,
    apiKeyEnc: key.enc,
    apiKeyIv: key.iv,
    apiSecretEnc: secret.enc,
    apiSecretIv: secret.iv,
    accountNumberEnc: null,
    accountNumberIv: null,
    environment: "sandbox",
    updatedBy: input.actorId,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(developerApiVault).set(values).where(eq(developerApiVault.id, existing.id));
  } else {
    await db.insert(developerApiVault).values(values);
  }
  return publicVaultStatus({
    configured: true,
    source: "vault",
    provider: META_VAULT_PROVIDER,
    label: META_VAULT_LABEL,
  });
}

export async function clearMetaVault(actorId: string | null): Promise<VaultPublicStatus> {
  const existing = await loadMetaVaultRow();
  if (existing) {
    await db
      .update(developerApiVault)
      .set({
        configured: false,
        apiKeyEnc: null,
        apiKeyIv: null,
        apiSecretEnc: null,
        apiSecretIv: null,
        accountNumberEnc: null,
        accountNumberIv: null,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(developerApiVault.id, existing.id));
  }
  if (envHasMetaApp()) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      provider: META_VAULT_PROVIDER,
      label: META_VAULT_LABEL,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    provider: META_VAULT_PROVIDER,
    label: META_VAULT_LABEL,
  });
}
