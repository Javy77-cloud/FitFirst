import { and, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret, isMaskedSecretInput } from "@/lib/secrets/vault";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { developerApiVault } from "@/lib/db/schema";
import type { FedExCredentials, FedExEnvironment } from "@/lib/fedex/client";
import { fedexCredentialsReady } from "@/lib/fedex/client";
import {
  FEDEX_VAULT_LABEL,
  FEDEX_VAULT_PROVIDER,
  publicVaultStatus,
  type VaultPublicStatus,
} from "./vault-public";

export {
  FEDEX_VAULT_LABEL,
  FEDEX_VAULT_PROVIDER,
  SECRET_MASK,
  publicVaultStatus,
  type VaultPublicStatus,
} from "./vault-public";

function envFedExCredentials(): FedExCredentials | null {
  const apiKey = process.env.FEDEX_API_KEY?.trim() || "";
  const apiSecret = process.env.FEDEX_API_SECRET?.trim() || "";
  if (!apiKey || !apiSecret) return null;
  const environment: FedExEnvironment =
    process.env.FEDEX_API_ENV?.trim() === "production" ? "production" : "sandbox";
  return {
    apiKey,
    apiSecret,
    accountNumber: process.env.FEDEX_ACCOUNT_NUMBER?.trim() || null,
    environment,
  };
}

function normalizeEnvironment(value: string | null | undefined): FedExEnvironment {
  return value === "production" ? "production" : "sandbox";
}

export async function loadFedExVaultRow() {
  try {
    const [row] = await db
      .select()
      .from(developerApiVault)
      .where(and(eq(developerApiVault.tenantId, DEFAULT_TENANT_ID), eq(developerApiVault.provider, FEDEX_VAULT_PROVIDER)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/** Server-only. Never return this object to a non-developer client. Never log it. */
export async function loadFedExCredentials(): Promise<FedExCredentials | null> {
  const row = await loadFedExVaultRow();
  if (row?.configured && row.apiKeyEnc && row.apiKeyIv && row.apiSecretEnc && row.apiSecretIv) {
    try {
      const creds: FedExCredentials = {
        apiKey: decryptSecret(row.apiKeyEnc, row.apiKeyIv),
        apiSecret: decryptSecret(row.apiSecretEnc, row.apiSecretIv),
        accountNumber:
          row.accountNumberEnc && row.accountNumberIv
            ? decryptSecret(row.accountNumberEnc, row.accountNumberIv)
            : null,
        environment: normalizeEnvironment(row.environment),
      };
      if (fedexCredentialsReady(creds)) return creds;
    } catch {
      /* fall through to env */
    }
  }
  return envFedExCredentials();
}

export async function fedexAddressEnabled(): Promise<boolean> {
  return fedexCredentialsReady(await loadFedExCredentials());
}

export async function loadFedExPublicStatus(): Promise<VaultPublicStatus> {
  const row = await loadFedExVaultRow();
  if (row?.configured && row.apiKeyEnc && row.apiSecretEnc) {
    return publicVaultStatus({
      configured: true,
      source: "vault",
      environment: normalizeEnvironment(row.environment),
    });
  }
  const env = envFedExCredentials();
  if (env) {
    return publicVaultStatus({ configured: true, source: "env", environment: env.environment });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    environment: normalizeEnvironment(row?.environment),
  });
}

export async function saveFedExVault(input: {
  apiKey: string;
  apiSecret: string;
  accountNumber?: string | null;
  environment: FedExEnvironment;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  if (isMaskedSecretInput(input.apiKey) || isMaskedSecretInput(input.apiSecret)) {
    throw new Error("Enter a real FedEx API key and secret. Masked values are not saved.");
  }
  const key = encryptSecret(input.apiKey);
  const secret = encryptSecret(input.apiSecret);
  const account = input.accountNumber?.trim() ? encryptSecret(input.accountNumber) : null;
  const existing = await loadFedExVaultRow();
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    provider: FEDEX_VAULT_PROVIDER,
    label: FEDEX_VAULT_LABEL,
    configured: true,
    apiKeyEnc: key.enc,
    apiKeyIv: key.iv,
    apiSecretEnc: secret.enc,
    apiSecretIv: secret.iv,
    accountNumberEnc: account?.enc ?? null,
    accountNumberIv: account?.iv ?? null,
    environment: input.environment,
    updatedBy: input.actorId,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(developerApiVault).set(values).where(eq(developerApiVault.id, existing.id));
  } else {
    await db.insert(developerApiVault).values(values);
  }
  return publicVaultStatus({ configured: true, source: "vault", environment: input.environment });
}

export async function clearFedExVault(actorId: string | null): Promise<VaultPublicStatus> {
  const existing = await loadFedExVaultRow();
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
  const env = envFedExCredentials();
  if (env) {
    return publicVaultStatus({ configured: true, source: "env", environment: env.environment });
  }
  return publicVaultStatus({ configured: false, source: "none", environment: "sandbox" });
}
