// TODO(LEGAL): consent checkbox must be live before first production tenant. Do not enable global pool writes until consent record exists.

export {
  LEARNING_POOL_CONSENT_HELP,
  LEARNING_POOL_CONSENT_LABEL,
  LEARNING_POOL_TERMS_VERSION,
} from "@/lib/learning-pipeline/consent";
export { isLearningPoolConsentLive, LEARNING_POOL_CONSENT_LIVE_DEFAULT } from "@/lib/learning-pipeline/flags";

export const ONBOARDING_CONSENT_FIELD = "contributeAnonymizedExtractionData";
export const ONBOARDING_CONSENT_DEFAULT = false;
