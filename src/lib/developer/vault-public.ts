import type { FedExEnvironment } from "@/lib/fedex/client";

export const FEDEX_VAULT_PROVIDER = "fedex";
export const FEDEX_VAULT_LABEL = "FedEx Address API";
/** @deprecated Prefer GETPARCELDATA — kept for any legacy vault rows. */
export const FLORIDA_PROPERTY_VAULT_PROVIDER = "florida_property";
export const FLORIDA_PROPERTY_VAULT_LABEL = "Florida Property API";
export const GETPARCELDATA_VAULT_PROVIDER = "getparceldata";
export const GETPARCELDATA_VAULT_LABEL = "GetParcelData";
export const PERMITSTACK_VAULT_PROVIDER = "permitstack";
export const PERMITSTACK_VAULT_LABEL = "PermitStack";
export const SECRET_MASK = "****************";

export type VaultPublicStatus = {
  provider: string;
  label: string;
  configured: boolean;
  source: "vault" | "env" | "none";
  /** FedEx only; GetParcelData ignores this. */
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
