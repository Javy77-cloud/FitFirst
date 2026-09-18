import { noteDeveloperApiCall } from "@/lib/developer/usage";
import { HEALTHSHERPA_ACA_LOGIN_URL, HEALTHSHERPA_ACA_NEEDS_PARTNER } from "./copy";
import {
  loadHealthSherpaAcaCredentials,
  type HealthSherpaEnvironment,
} from "./vault";

export const HEALTHSHERPA_ACA_BASE = {
  sandbox: "https://api.ichra-staging.healthsherpa.com",
  production: "https://api.ichra.healthsherpa.com",
} as const;

export const HEALTHSHERPA_ACA_QUOTE_PATHS = ["/api/v1/quotes", "/quotes"] as const;

export type HealthSherpaAcaScaffoldResult = {
  ready: boolean;
  message: string;
};

export type HealthSherpaAcaApplicant = {
  age: number;
  relationship: "primary" | "spouse" | "dependent";
  smoker: boolean;
};

export type HealthSherpaAcaQuoteInput = {
  zip: string;
  fips?: string | null;
  state?: string | null;
  householdIncome?: number | null;
  planYear?: number;
  applicants: HealthSherpaAcaApplicant[];
  environment?: HealthSherpaEnvironment;
  fetchImpl?: typeof fetch;
};

export type HealthSherpaAcaQuoteResult =
  | {
      ok: true;
      status: number;
      planCount: number;
      marketplaceUrl: string;
      message: string;
    }
  | { ok: false; status: number; message: string };

/** ACA QuoteConnect is live when a partner key exists. In-desk quoting stays in HealthSherpa. */
export async function healthSherpaAcaStatus(): Promise<HealthSherpaAcaScaffoldResult> {
  const creds = await loadHealthSherpaAcaCredentials();
  if (!creds) {
    return { ready: false, message: HEALTHSHERPA_ACA_NEEDS_PARTNER };
  }
  return {
    ready: true,
    message:
      "Marketplace partner key is stored. Sync opens HealthSherpa Marketplace and can call QuoteConnect when ZIP + applicant age are on the deal. FitFirst does not quote ACA inside the desk.",
  };
}

function acaHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
  };
}

export async function healthSherpaAcaQuote(
  input: HealthSherpaAcaQuoteInput,
): Promise<HealthSherpaAcaQuoteResult> {
  const creds = await loadHealthSherpaAcaCredentials();
  if (!creds) {
    return { ok: false, status: 0, message: HEALTHSHERPA_ACA_NEEDS_PARTNER };
  }
  const zip = input.zip.replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) {
    return {
      ok: false,
      status: 0,
      message: "Marketplace QuoteConnect needs a 5-digit ZIP on the contact or deal.",
    };
  }
  if (!input.applicants.length) {
    return {
      ok: false,
      status: 0,
      message: "Marketplace QuoteConnect needs the applicant date of birth so FitFirst can send age.",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const environment = input.environment ?? creds.environment;
  const base = HEALTHSHERPA_ACA_BASE[environment];
  const body: Record<string, unknown> = {
    zip_code: zip,
    applicants: input.applicants,
    per_page: 5,
    plan_year: input.planYear ?? new Date().getUTCFullYear(),
  };
  const fips = input.fips?.replace(/\D/g, "").slice(0, 5);
  if (fips && fips.length === 5) body.fip_code = fips;
  if (input.state) body.state = input.state.slice(0, 2).toUpperCase();
  if (input.householdIncome && input.householdIncome > 0) {
    body.household_income = input.householdIncome;
  }

  let lastStatus = 0;
  let lastMessage = "QuoteConnect did not return plans.";
  for (const path of HEALTHSHERPA_ACA_QUOTE_PATHS) {
    try {
      const response = await fetchImpl(`${base}${path}`, {
        method: "POST",
        headers: acaHeaders(creds.apiKey),
        body: JSON.stringify(body),
      });
      noteDeveloperApiCall("healthsherpa_aca");
      lastStatus = response.status;
      let json: unknown = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }
      const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
      const plans = Array.isArray(root.plans) ? root.plans : [];
      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          planCount: plans.length,
          marketplaceUrl: HEALTHSHERPA_ACA_LOGIN_URL,
          message:
            plans.length > 0
              ? `QuoteConnect returned ${plans.length} Marketplace plan${plans.length === 1 ? "" : "s"}. Opening HealthSherpa to finish enrollment.`
              : "QuoteConnect accepted the partner key. Opening HealthSherpa Marketplace to pick a plan.",
        };
      }
      const err = root.error;
      lastMessage =
        typeof err === "string"
          ? err
          : typeof (err as { message?: string } | null)?.message === "string"
            ? (err as { message: string }).message
            : `QuoteConnect returned ${response.status}. Opening HealthSherpa Marketplace.`;
      if (response.status !== 404) break;
    } catch {
      lastMessage = "Could not reach HealthSherpa QuoteConnect. Opening HealthSherpa Marketplace.";
    }
  }

  return { ok: false, status: lastStatus, message: lastMessage };
}

export async function healthSherpaAcaPing(input?: {
  environment?: "sandbox" | "production";
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const result = await healthSherpaAcaQuote({
    zip: "33101",
    fips: "12086",
    state: "FL",
    applicants: [{ age: 35, relationship: "primary", smoker: false }],
    environment: input?.environment,
    fetchImpl: input?.fetchImpl,
  });
  if (result.ok) {
    return { ok: true, status: result.status, message: result.message };
  }
  return { ok: false, status: result.status, message: result.message };
}
