/**
 * Agency BYO GetParcelData API key.
 * Env first (GETPARCELDATA_API_KEY), then developer vault if a row exists.
 * Missing key is a hard wall — never invent a parcel.
 */

export const GETPARCELDATA_ENV = "GETPARCELDATA_API_KEY";
export const GETPARCELDATA_VAULT_PROVIDER = "getparceldata";
export const GETPARCELDATA_POINT_URL = "https://api.getparceldata.com/v1/parcels/point";

export const MISSING_KEY_MESSAGE =
  "GetParcelData API key is not configured. Set GETPARCELDATA_API_KEY (agency BYO) in env or the developer vault. No lookup ran.";

export function readGetParcelDataApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env[GETPARCELDATA_ENV] ?? "").trim();
}

export function getParcelDataKeyReady(key: string | null | undefined): boolean {
  return Boolean(key?.trim());
}

export async function loadGetParcelDataApiKey(): Promise<string> {
  const fromEnv = readGetParcelDataApiKey();
  if (fromEnv) return fromEnv;
  try {
    const { loadGetParcelDataVaultKey } = await import("@/lib/developer/vault");
    return (await loadGetParcelDataVaultKey()) ?? "";
  } catch {
    return "";
  }
}
