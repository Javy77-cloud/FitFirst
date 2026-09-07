/**
 * Purchase / legal gate. Default OFF — the consent checkbox is dormant until
 * the purchase flow flips LEARNING_POOL_CONSENT_LIVE.
 */
export const LEARNING_POOL_CONSENT_LIVE_DEFAULT = false;

export function isLearningPoolConsentLive(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = String(env.LEARNING_POOL_CONSENT_LIVE ?? "").trim().toLowerCase();
  if (!raw) return LEARNING_POOL_CONSENT_LIVE_DEFAULT;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
