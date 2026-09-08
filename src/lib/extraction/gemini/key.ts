/**
 * Agency BYO Gemini / Google AI Studio key.
 * Env first (GEMINI_API_KEY). Optional developer vault provider=`gemini` later.
 * Missing key is a hard wall — Fill from source does not invent fields.
 */

export const GEMINI_ENV_KEY = "GEMINI_API_KEY";
export const GEMINI_ENV_MODEL = "GEMINI_MODEL";
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
export const GEMINI_VAULT_PROVIDER = "gemini";

export const MISSING_GEMINI_KEY_MESSAGE =
  "Gemini API key is not configured. Set GEMINI_API_KEY (agency BYO) in env or the developer vault. No Fill from source ran.";

export function readGeminiApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env[GEMINI_ENV_KEY] ?? "").trim();
}

export function readGeminiModel(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const model = (env[GEMINI_ENV_MODEL] ?? "").trim();
  return model || GEMINI_DEFAULT_MODEL;
}

export function geminiKeyReady(key: string | null | undefined): boolean {
  return Boolean(key?.trim());
}

/** Env-first MVP. Vault provider `gemini` can plug in later without changing callers. */
export async function loadGeminiApiKey(): Promise<string> {
  return readGeminiApiKey();
}
