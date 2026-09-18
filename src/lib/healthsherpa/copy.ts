/** Honest, agent-visible HealthSherpa copy. No FitFirst fee. */

export const HEALTHSHERPA_VENDOR = "HealthSherpa";
export const HEALTHSHERPA_NO_FF_FEE =
  "Agency brings its own HealthSherpa seat. FitFirst does not add a HealthSherpa fee.";

export const HEALTHSHERPA_MEDICARE_BLURB =
  "Medicare Partner API: sync the FitFirst contact, open the HealthSherpa quote page, and ingest enrollment webhooks. Manual enrollments in HealthSherpa may not fire the webhook — re-sync or enter the policy by hand if the file is missing.";

export const HEALTHSHERPA_ACA_BLURB =
  "Marketplace / ACA uses the same HealthSherpa integration as Medicare. Paste the ICHRA / QuoteConnect partner key to enable Marketplace handoff and QuoteConnect. Enrollment webhooks share POST /api/integrations/healthsherpa/webhook. FitFirst does not quote ACA inside this desk.";

export const HEALTHSHERPA_INBOUND_BLURB =
  "Medicare and Marketplace share this URL. HealthSherpa Authentication = API Key — they send X-API-Key (Bearer / api-key also accepted). Paste the same inbound vault secret. Manual enrollments may not fire this webhook.";

export const HEALTHSHERPA_MANUAL_LINES_NOTE =
  "Dental, Vision, and Short-term stay manual. They are not a HealthSherpa enrollment path.";

export const HEALTHSHERPA_SKIP_REKEY =
  "HealthSherpa will send the submitted application back to FitFirst. Skip re-keying Medicare / Marketplace cells unless you need them on file before enrollment.";

export const HEALTHSHERPA_KEYS_MISSING =
  "HealthSherpa Medicare API key is not configured. Add it in Settings → Developer Hub → API vault (or HEALTHSHERPA_MEDICARE_API_KEY). No sync ran.";

export const HEALTHSHERPA_ACA_NEEDS_PARTNER =
  "Marketplace / ACA needs HealthSherpa partner credentials (QuoteConnect / ICHRA). Medicare sync is available. FitFirst does not quote ACA here.";

export const HEALTHSHERPA_ACA_READY =
  "Syncs the contact and opens HealthSherpa Marketplace. QuoteConnect runs when ZIP and date of birth are on file. Plans stay in HealthSherpa.";

export const HEALTHSHERPA_WEBHOOK_PATH = "/api/integrations/healthsherpa/webhook";

export const HEALTHSHERPA_LOGIN_URL = "https://medicare.healthsherpa.com";
export const HEALTHSHERPA_ACA_LOGIN_URL = "https://www.healthsherpa.com";
export const HEALTHSHERPA_DOCS_URL = "https://docs.medicare.healthsherpa.com";
export const HEALTHSHERPA_ACA_DOCS_URL = "https://docs.ichra.healthsherpa.com";
