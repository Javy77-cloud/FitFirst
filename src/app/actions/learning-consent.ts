"use server";

import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { createConsentStore } from "@/lib/learning-pipeline/consent";
import { isLearningPoolConsentLive } from "@/lib/learning-pipeline/flags";
import { ONBOARDING_CONSENT_FIELD } from "@/lib/onboarding";
import { flashAction } from "@/lib/flash-action";

const consents = createConsentStore();

export async function recordLearningPoolConsent(formData: FormData) {
  if (!isLearningPoolConsentLive()) {
    return { ok: false as const, reason: "consent_not_live" as const };
  }

  const session = await currentDeskSession();
  const agencyId = session.user?.tenantId ?? DEFAULT_TENANT_ID;
  const optedIn = formData.get(ONBOARDING_CONSENT_FIELD) === "1";
  consents.record({
    agencyId,
    tenantId: agencyId,
    optedIn,
  });

  flashAction("/onboarding/purchase", "consent-saved");
}

export async function peekLearningPoolConsent(agencyId: string) {
  return consents.getByAgency(agencyId);
}
