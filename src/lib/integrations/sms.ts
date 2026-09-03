import { notImplemented, type NotImplementedResult } from "./types";

/** Phase-two stub. Does not buy numbers or call Twilio. */
export function connectSmsProvider(provider: string): NotImplementedResult {
  return notImplemented(`SMS provider connect (${provider})`);
}

export function sendSms(): NotImplementedResult {
  return notImplemented("SMS send");
}
