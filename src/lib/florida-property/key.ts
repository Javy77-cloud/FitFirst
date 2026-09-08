/**
 * Agency BYO Florida Property API key.
 * Env first (FLORIDA_PROPERTY_API_KEY), then developer vault if a row exists.
 * Missing key is a hard wall — never invent a parcel.
 */

export const FLORIDA_PROPERTY_ENV = "FLORIDA_PROPERTY_API_KEY";
export const FLORIDA_PROPERTY_VAULT_PROVIDER = "florida_property";
export const FLORIDA_PROPERTY_SEARCH_URL = "https://floridapropertyapi.com/api/v1/parcels/search";

export const MISSING_KEY_MESSAGE =
  "Florida Property API key is not configured. Set FLORIDA_PROPERTY_API_KEY (agency BYO) in env or the developer vault. No lookup ran.";

export function readFloridaPropertyApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env[FLORIDA_PROPERTY_ENV] ?? "").trim();
}

export function floridaPropertyKeyReady(key: string | null | undefined): boolean {
  return Boolean(key?.trim());
}

export async function loadFloridaPropertyApiKey(): Promise<string> {
  const fromEnv = readFloridaPropertyApiKey();
  if (fromEnv) return fromEnv;
  try {
    const { loadFloridaPropertyVaultKey } = await import("@/lib/developer/vault");
    return (await loadFloridaPropertyVaultKey()) ?? "";
  } catch {
    return "";
  }
}
