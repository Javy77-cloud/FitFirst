import { and, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret, isMaskedSecretInput } from "@/lib/secrets/vault";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { developerApiVault } from "@/lib/db/schema";
import { publicVaultStatus, SECRET_MASK, type VaultPublicStatus } from "@/lib/developer/vault-public";
import type { FedExEnvironment } from "@/lib/fedex/client";

export const HEALTHSHERPA_MEDICARE_VAULT_PROVIDER = "healthsherpa_medicare";
export const HEALTHSHERPA_MEDICARE_VAULT_LABEL = "HealthSherpa Medicare";
export const HEALTHSHERPA_ACA_VAULT_PROVIDER = "healthsherpa_aca";
export const HEALTHSHERPA_ACA_VAULT_LABEL = "HealthSherpa Marketplace / ACA";
export const HEALTHSHERPA_INBOUND_VAULT_PROVIDER = "healthsherpa_inbound";
export const HEALTHSHERPA_INBOUND_VAULT_LABEL = "HealthSherpa inbound webhook";

export type HealthSherpaEnvironment = FedExEnvironment;

export type HealthSherpaMedicareCredentials = {
  apiKey: string;
  agentEmail: string | null;
  environment: HealthSherpaEnvironment;
};

function normalizeEnvironment(value: string | null | undefined): HealthSherpaEnvironment {
  return value === "production" ? "production" : "sandbox";
}

async function loadVaultRow(provider: string) {
  try {
    const [row] = await db
      .select()
      .from(developerApiVault)
      .where(and(eq(developerApiVault.tenantId, DEFAULT_TENANT_ID), eq(developerApiVault.provider, provider)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

function envMedicare(): HealthSherpaMedicareCredentials | null {
  const apiKey = process.env.HEALTHSHERPA_MEDICARE_API_KEY?.trim() || "";
  if (!apiKey) return null;
  return {
    apiKey,
    agentEmail: process.env.HEALTHSHERPA_AGENT_EMAIL?.trim() || null,
    environment: normalizeEnvironment(process.env.HEALTHSHERPA_MEDICARE_ENV),
  };
}

function envAcaKey(): string | null {
  return process.env.HEALTHSHERPA_ACA_API_KEY?.trim() || null;
}

function envInboundKey(): string | null {
  return process.env.HEALTHSHERPA_WEBHOOK_API_KEY?.trim() || null;
}

export async function loadHealthSherpaMedicareCredentials(): Promise<HealthSherpaMedicareCredentials | null> {
  const row = await loadVaultRow(HEALTHSHERPA_MEDICARE_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc && row.apiKeyIv) {
    try {
      const creds: HealthSherpaMedicareCredentials = {
        apiKey: decryptSecret(row.apiKeyEnc, row.apiKeyIv).trim(),
        agentEmail:
          row.accountNumberEnc && row.accountNumberIv
            ? decryptSecret(row.accountNumberEnc, row.accountNumberIv).trim() || null
            : null,
        environment: normalizeEnvironment(row.environment),
      };
      if (creds.apiKey) return creds;
    } catch {
      /* fall through */
    }
  }
  return envMedicare();
}

export async function loadHealthSherpaAcaKey(): Promise<string | null> {
  const row = await loadVaultRow(HEALTHSHERPA_ACA_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc && row.apiKeyIv) {
    try {
      const key = decryptSecret(row.apiKeyEnc, row.apiKeyIv).trim();
      if (key) return key;
    } catch {
      /* fall through */
    }
  }
  return envAcaKey();
}

export async function loadHealthSherpaInboundKey(): Promise<string | null> {
  const row = await loadVaultRow(HEALTHSHERPA_INBOUND_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc && row.apiKeyIv) {
    try {
      const key = decryptSecret(row.apiKeyEnc, row.apiKeyIv).trim();
      if (key) return key;
    } catch {
      /* fall through */
    }
  }
  return envInboundKey();
}

export async function loadHealthSherpaMedicarePublicStatus(): Promise<VaultPublicStatus> {
  const row = await loadVaultRow(HEALTHSHERPA_MEDICARE_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc) {
    return publicVaultStatus({
      configured: true,
      source: "vault",
      environment: normalizeEnvironment(row.environment),
      provider: HEALTHSHERPA_MEDICARE_VAULT_PROVIDER,
      label: HEALTHSHERPA_MEDICARE_VAULT_LABEL,
    });
  }
  const env = envMedicare();
  if (env) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      environment: env.environment,
      provider: HEALTHSHERPA_MEDICARE_VAULT_PROVIDER,
      label: HEALTHSHERPA_MEDICARE_VAULT_LABEL,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    environment: normalizeEnvironment(row?.environment),
    provider: HEALTHSHERPA_MEDICARE_VAULT_PROVIDER,
    label: HEALTHSHERPA_MEDICARE_VAULT_LABEL,
  });
}

export async function loadHealthSherpaAcaPublicStatus(): Promise<VaultPublicStatus> {
  const row = await loadVaultRow(HEALTHSHERPA_ACA_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc) {
    return publicVaultStatus({
      configured: true,
      source: "vault",
      provider: HEALTHSHERPA_ACA_VAULT_PROVIDER,
      label: HEALTHSHERPA_ACA_VAULT_LABEL,
    });
  }
  if (envAcaKey()) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      provider: HEALTHSHERPA_ACA_VAULT_PROVIDER,
      label: HEALTHSHERPA_ACA_VAULT_LABEL,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    provider: HEALTHSHERPA_ACA_VAULT_PROVIDER,
    label: HEALTHSHERPA_ACA_VAULT_LABEL,
  });
}

export async function loadHealthSherpaInboundPublicStatus(): Promise<VaultPublicStatus> {
  const row = await loadVaultRow(HEALTHSHERPA_INBOUND_VAULT_PROVIDER);
  if (row?.configured && row.apiKeyEnc) {
    return publicVaultStatus({
      configured: true,
      source: "vault",
      provider: HEALTHSHERPA_INBOUND_VAULT_PROVIDER,
      label: HEALTHSHERPA_INBOUND_VAULT_LABEL,
    });
  }
  if (envInboundKey()) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      provider: HEALTHSHERPA_INBOUND_VAULT_PROVIDER,
      label: HEALTHSHERPA_INBOUND_VAULT_LABEL,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    provider: HEALTHSHERPA_INBOUND_VAULT_PROVIDER,
    label: HEALTHSHERPA_INBOUND_VAULT_LABEL,
  });
}

async function saveSingleKey(input: {
  provider: string;
  label: string;
  apiKey: string;
  agentEmail?: string | null;
  environment?: HealthSherpaEnvironment;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  if (isMaskedSecretInput(input.apiKey) || !input.apiKey.trim()) {
    throw new Error("Enter a real API key. Masked values are not saved.");
  }
  const key = encryptSecret(input.apiKey.trim());
  const email = input.agentEmail?.trim() ? encryptSecret(input.agentEmail.trim()) : null;
  const existing = await loadVaultRow(input.provider);
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    provider: input.provider,
    label: input.label,
    configured: true,
    apiKeyEnc: key.enc,
    apiKeyIv: key.iv,
    apiSecretEnc: null,
    apiSecretIv: null,
    accountNumberEnc: email?.enc ?? null,
    accountNumberIv: email?.iv ?? null,
    environment: input.environment ?? "sandbox",
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
    environment: input.environment ?? "sandbox",
    provider: input.provider,
    label: input.label,
  });
}

async function clearSingleKey(input: {
  provider: string;
  label: string;
  actorId: string | null;
  envFallback: boolean;
  environment?: HealthSherpaEnvironment;
}): Promise<VaultPublicStatus> {
  const existing = await loadVaultRow(input.provider);
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
        updatedBy: input.actorId,
        updatedAt: new Date(),
      })
      .where(eq(developerApiVault.id, existing.id));
  }
  if (input.envFallback) {
    return publicVaultStatus({
      configured: true,
      source: "env",
      environment: input.environment ?? "sandbox",
      provider: input.provider,
      label: input.label,
    });
  }
  return publicVaultStatus({
    configured: false,
    source: "none",
    provider: input.provider,
    label: input.label,
  });
}

export async function saveHealthSherpaMedicareVault(input: {
  apiKey: string;
  agentEmail?: string | null;
  environment: HealthSherpaEnvironment;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  return saveSingleKey({
    provider: HEALTHSHERPA_MEDICARE_VAULT_PROVIDER,
    label: HEALTHSHERPA_MEDICARE_VAULT_LABEL,
    apiKey: input.apiKey,
    agentEmail: input.agentEmail,
    environment: input.environment,
    actorId: input.actorId,
  });
}

export async function clearHealthSherpaMedicareVault(actorId: string | null): Promise<VaultPublicStatus> {
  return clearSingleKey({
    provider: HEALTHSHERPA_MEDICARE_VAULT_PROVIDER,
    label: HEALTHSHERPA_MEDICARE_VAULT_LABEL,
    actorId,
    envFallback: Boolean(envMedicare()),
    environment: envMedicare()?.environment,
  });
}

export async function saveHealthSherpaAcaVault(input: {
  apiKey: string;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  return saveSingleKey({
    provider: HEALTHSHERPA_ACA_VAULT_PROVIDER,
    label: HEALTHSHERPA_ACA_VAULT_LABEL,
    apiKey: input.apiKey,
    actorId: input.actorId,
  });
}

export async function clearHealthSherpaAcaVault(actorId: string | null): Promise<VaultPublicStatus> {
  return clearSingleKey({
    provider: HEALTHSHERPA_ACA_VAULT_PROVIDER,
    label: HEALTHSHERPA_ACA_VAULT_LABEL,
    actorId,
    envFallback: Boolean(envAcaKey()),
  });
}

export async function saveHealthSherpaInboundVault(input: {
  apiKey: string;
  actorId: string | null;
}): Promise<VaultPublicStatus> {
  return saveSingleKey({
    provider: HEALTHSHERPA_INBOUND_VAULT_PROVIDER,
    label: HEALTHSHERPA_INBOUND_VAULT_LABEL,
    apiKey: input.apiKey,
    actorId: input.actorId,
  });
}

export async function clearHealthSherpaInboundVault(actorId: string | null): Promise<VaultPublicStatus> {
  return clearSingleKey({
    provider: HEALTHSHERPA_INBOUND_VAULT_PROVIDER,
    label: HEALTHSHERPA_INBOUND_VAULT_LABEL,
    actorId,
    envFallback: Boolean(envInboundKey()),
  });
}

export { SECRET_MASK };
