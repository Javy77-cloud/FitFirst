import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";

export async function createGoogleMeetConference(input: {
  title: string;
  startAt: Date;
  endAt: Date;
  activityId?: string;
}): Promise<{ url: string; externalId: string | null }> {
  const calendar = await loadByoConnection("google_calendar");
  const meet = await loadByoConnection("google_meet");
  const provider = calendar?.connected ? "google_calendar" : meet?.connected ? "google_meet" : null;
  if (!provider) throw new Error("Connect Google Calendar or Google Meet first.");
  const token = await liveAccessToken(provider);
  if (!token) throw new Error("Google Calendar / Meet token is missing. Reconnect.");
  const requestId = crypto.randomUUID();
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: input.startAt.toISOString() },
        end: { dateTime: input.endAt.toISOString() },
        extendedProperties: input.activityId
          ? { private: { fitfirstActivityId: input.activityId } }
          : undefined,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const data = (await res.json()) as {
    id?: string;
    error?: { message?: string };
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Google Meet create failed (${res.status}).`);
  }
  const entry = data.conferenceData?.entryPoints?.find((row) => row.entryPointType === "video")?.uri;
  const link = data.hangoutLink || entry;
  if (!link) throw new Error("Google created the event but did not return a Meet URL.");
  return { url: link, externalId: data.id ?? null };
}

export async function createGoogleMeetLink(input: {
  title: string;
  startAt: Date;
  endAt: Date;
  activityId?: string;
}): Promise<string> {
  const created = await createGoogleMeetConference(input);
  return created.url;
}
