import type { FedExEnvironment } from "@/lib/fedex/client";

export const FEDEX_VAULT_PROVIDER = "fedex";
export const FEDEX_VAULT_LABEL = "FedEx Address API";
export const FLORIDA_PROPERTY_VAULT_PROVIDER = "florida_property";
export const FLORIDA_PROPERTY_VAULT_LABEL = "Florida Property API";
export const SECRET_MASK = "****************";

export type VaultPublicStatus = {
  provider: string;
  label: string;
  configured: boolean;
  source: "vault" | "env" | "none";
  /** FedEx only; Florida Property ignores this. */
  environment: FedExEnvironment;
  masked: string;
};

export function publicVaultStatus(input: {
  configured: boolean;
  source: VaultPublicStatus["source"];
  environment?: FedExEnvironment;
  provider?: string;
  label?: string;
}): VaultPublicStatus {
  return {
    provider: input.provider ?? FEDEX_VAULT_PROVIDER,
    label: input.label ?? FEDEX_VAULT_LABEL,
    configured: input.configured,
    source: input.source,
    environment: input.environment ?? "sandbox",
    masked: input.configured ? SECRET_MASK : "",
  };
}
