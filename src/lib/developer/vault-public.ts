import type { FedExEnvironment } from "@/lib/fedex/client";

export const FEDEX_VAULT_PROVIDER = "fedex";
export const FEDEX_VAULT_LABEL = "FedEx Address API";
export const SECRET_MASK = "****************";

export type VaultPublicStatus = {
  provider: typeof FEDEX_VAULT_PROVIDER;
  label: typeof FEDEX_VAULT_LABEL;
  configured: boolean;
  source: "vault" | "env" | "none";
  environment: FedExEnvironment;
  masked: string;
};

export function publicVaultStatus(input: {
  configured: boolean;
  source: VaultPublicStatus["source"];
  environment: FedExEnvironment;
}): VaultPublicStatus {
  return {
    provider: FEDEX_VAULT_PROVIDER,
    label: FEDEX_VAULT_LABEL,
    configured: input.configured,
    source: input.source,
    environment: input.environment,
    masked: input.configured ? SECRET_MASK : "",
  };
}
