import { anonymizeCorrection, assertTrainingRecordClean } from "../anonymize/service";
import type { ConsentStore } from "../consent/store";
import type { PoolWriteResult, RawCorrection } from "../types";
import { refuseGlobalPoolWrite } from "./gate";
import type { GlobalPoolStore } from "./store";

export function writeAnonymizedToGlobalPool(input: {
  raw: RawCorrection;
  agencyId: string;
  consents: ConsentStore;
  pool: GlobalPoolStore;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): PoolWriteResult {
  const refused = refuseGlobalPoolWrite({
    agencyId: input.agencyId,
    consents: input.consents,
    env: input.env,
  });
  if (refused) return { ok: false, reason: refused };

  try {
    const record = anonymizeCorrection(input.raw);
    assertTrainingRecordClean(record);
    input.pool.write(record);
    return { ok: true, record };
  } catch {
    return { ok: false, reason: "anonymization_failed" };
  }
}
