/**
 * Agency BYO Gemini / Google AI Studio key.
 * Env first (GEMINI_API_KEY). Optional developer vault provider=`gemini` later.
 * Missing key is a hard wall — Fill from source does not invent fields.
 *
 * MODEL IS HARD-PINNED to gemini-3.6-flash. Stale shell/process GEMINI_MODEL
 * (e.g. gemini-2.5-flash) is remapped or ignored — never sent to the API.
 */

export const GEMINI_ENV_KEY = "GEMINI_API_KEY";
export const GEMINI_ENV_MODEL = "GEMINI_MODEL";
/** Only Fill model — do not change without a working generateContent smoke. */
export const GEMINI_DEFAULT_MODEL = "gemini-3.6-flash";
export const GEMINI_VAULT_PROVIDER = "gemini";

/** Retired / wrong model ids → current Fill model. Stale shell env often pins 2.5-flash. */
export const GEMINI_RETIRED_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-flash": GEMINI_DEFAULT_MODEL,
  "gemini-2.5-flash-lite": GEMINI_DEFAULT_MODEL,
  "gemini-2.5-pro": GEMINI_DEFAULT_MODEL,
  "gemini-2.0-flash": GEMINI_DEFAULT_MODEL,
  "gemini-2.0-flash-001": GEMINI_DEFAULT_MODEL,
  "gemini-2.0-flash-lite": GEMINI_DEFAULT_MODEL,
  "gemini-1.5-flash": GEMINI_DEFAULT_MODEL,
  "gemini-1.5-pro": GEMINI_DEFAULT_MODEL,
  "models/gemini-2.5-flash": GEMINI_DEFAULT_MODEL,
  "models/gemini-2.0-flash": GEMINI_DEFAULT_MODEL,
};

export const MISSING_GEMINI_KEY_MESSAGE =
  "Gemini API key is not configured. Set GEMINI_API_KEY (agency BYO) in env or the developer vault. No Fill from source ran.";

export function readGeminiApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env[GEMINI_ENV_KEY] ?? "").trim();
}

/**
 * Resolve a requested model id to the hard-pinned Fill model.
 * Empty / retired / anything containing 2.5|2.0|1.5 → gemini-3.6-flash.
 * Non-empty current ids are remapped when listed; otherwise forced to default
 * so stale env can never 404 Fill.
 */
export function resolveGeminiModel(model: string | null | undefined): string {
  const trimmed = (model ?? "").trim();
  if (!trimmed) return GEMINI_DEFAULT_MODEL;
  if (trimmed === GEMINI_DEFAULT_MODEL) return GEMINI_DEFAULT_MODEL;
  const mapped = GEMINI_RETIRED_MODEL_MAP[trimmed];
  if (mapped) return mapped;
  // Strip models/ prefix and retry map
  const bare = trimmed.replace(/^models\//, "");
  if (bare !== trimmed) {
    const mappedBare = GEMINI_RETIRED_MODEL_MAP[bare];
    if (mappedBare) return mappedBare;
    if (bare === GEMINI_DEFAULT_MODEL) return GEMINI_DEFAULT_MODEL;
  }
  // Any legacy flash/pro family → hard pin (ignore unknown env leftovers)
  if (/gemini-[12]\.[0-9]/i.test(trimmed) || /2\.5|2\.0|1\.5/.test(trimmed)) {
    return GEMINI_DEFAULT_MODEL;
  }
  // Hard pin: never send an unlisted model id from env/options
  return GEMINI_DEFAULT_MODEL;
}

/** Always the hard-pinned Fill model. Ignores stale GEMINI_MODEL=gemini-2.5-flash. */
export function readGeminiModel(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return resolveGeminiModel(env[GEMINI_ENV_MODEL]);
}

export function geminiKeyReady(key: string | null | undefined): boolean {
  return Boolean(key?.trim());
}

/** Env-first MVP. Vault provider `gemini` can plug in later without changing callers. */
export async function loadGeminiApiKey(): Promise<string> {
  return readGeminiApiKey();
}
