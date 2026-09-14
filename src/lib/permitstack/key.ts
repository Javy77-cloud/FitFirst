/**
 * Agency BYO PermitStack API key.
 * Env first (PERMITSTACK_API_KEY), then developer vault if a row exists.
 * Missing key is a soft skip — Fill continues with free sources + GetParcelData.
 */

export const PERMITSTACK_ENV = "PERMITSTACK_API_KEY";
export const PERMITSTACK_VAULT_PROVIDER = "permitstack";
export const PERMITSTACK_HISTORY_URL = "https://api.permit-stack.com/v1/property/history";

export const MISSING_PERMITSTACK_KEY_MESSAGE =
  "PermitStack API key is not configured. Set PERMITSTACK_API_KEY (agency BYO) in env or the developer vault. No permit lookup ran.";

export function readPermitStackApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env[PERMITSTACK_ENV] ?? "").trim();
}

export function permitStackKeyReady(key: string | null | undefined): boolean {
  return Boolean(key?.trim());
}

export async function loadPermitStackApiKey(): Promise<string> {
  const fromEnv = readPermitStackApiKey();
  if (fromEnv) return fromEnv;
  try {
    const { loadPermitStackVaultKey } = await import("@/lib/developer/vault");
    return (await loadPermitStackVaultKey()) ?? "";
  } catch {
    return "";
  }
}
