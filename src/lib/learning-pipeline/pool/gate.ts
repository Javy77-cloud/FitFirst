import { isLearningPoolConsentLive } from "../flags";
import type { ConsentStore } from "../consent/store";
import type { PoolWriteRefusal } from "../types";

export function refuseGlobalPoolWrite(input: {
  agencyId: string;
  consents: ConsentStore;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): PoolWriteRefusal | null {
  if (!isLearningPoolConsentLive(input.env)) return "consent_not_live";
  const row = input.consents.getByAgency(input.agencyId);
  if (!row) return "no_consent_record";
  if (!row.optedIn || !row.agreedAt) return "declined";
  return null;
}
