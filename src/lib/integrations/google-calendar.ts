import { notImplemented, type NotImplementedResult } from "./types";

/** OAuth stub. Does not open Google, store tokens, or call Calendar APIs. */
export function startGoogleOAuth(): NotImplementedResult {
  return notImplemented("Google Calendar OAuth");
}

export function completeGoogleOAuthStub(displayEmail?: string): {
  connected: true;
  displayEmail: string;
  oauth: NotImplementedResult;
} {
  return {
    connected: true,
    displayEmail: displayEmail?.trim() || "agency@calendar.stub",
    oauth: startGoogleOAuth(),
  };
}

export function syncGoogleCalendarIn(): NotImplementedResult {
  return notImplemented("Google Calendar sync in");
}

export function syncGoogleCalendarOut(): NotImplementedResult {
  return notImplemented("Google Calendar sync out");
}
