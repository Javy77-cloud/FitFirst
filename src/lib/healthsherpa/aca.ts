import { noteDeveloperApiCall } from "@/lib/developer/usage";
import { HEALTHSHERPA_ACA_NEEDS_PARTNER } from "./copy";
import { loadHealthSherpaAcaKey } from "./vault";

export const HEALTHSHERPA_ACA_BASE = {
  sandbox: "https://api.ichra-staging.healthsherpa.com",
  production: "https://api.ichra.healthsherpa.com",
} as const;

export type HealthSherpaAcaScaffoldResult = {
  ready: boolean;
  message: string;
};

/** ACA QuoteConnect / EnrollConnect stay scaffolded until partner credentials exist. */
export async function healthSherpaAcaStatus(): Promise<HealthSherpaAcaScaffoldResult> {
  const key = await loadHealthSherpaAcaKey();
  if (!key) {
    return { ready: false, message: HEALTHSHERPA_ACA_NEEDS_PARTNER };
  }
  return {
    ready: true,
    message:
      "Marketplace partner key is stored. FitFirst still does not quote ACA inside the desk — use HealthSherpa QuoteConnect / deeplink after partner onboarding confirms the path.",
  };
}

export async function healthSherpaAcaPing(input?: {
  environment?: "sandbox" | "production";
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const key = await loadHealthSherpaAcaKey();
  if (!key) {
    return { ok: false, status: 0, message: HEALTHSHERPA_ACA_NEEDS_PARTNER };
  }
  const fetchImpl = input?.fetchImpl ?? fetch;
  const base = HEALTHSHERPA_ACA_BASE[input?.environment ?? "sandbox"];
  try {
    const response = await fetchImpl(`${base}/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({ ping: true }),
    });
    noteDeveloperApiCall("healthsherpa_aca");
    return {
      ok: response.ok,
      status: response.status,
      message: response.ok
        ? "QuoteConnect accepted the partner key."
        : `QuoteConnect returned ${response.status}. Partner onboarding may still be required.`,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Could not reach HealthSherpa QuoteConnect. Partner onboarding may still be required.",
    };
  }
}
