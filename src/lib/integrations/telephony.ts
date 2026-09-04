import { notImplemented, type NotImplementedResult } from "./types";

/** Phase-two stub. Agency pays the trunk. FitFirst does not buy numbers or store keys. */
export function connectTelephonyProvider(provider: string): NotImplementedResult {
  return notImplemented(`Telephony connect (${provider})`);
}

export function placeDeskCall(): NotImplementedResult {
  return notImplemented("Desk PSTN place-call");
}
