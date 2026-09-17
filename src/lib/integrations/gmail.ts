import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";

export type GmailMessagePreview = {
  id: string;
  subject: string;
  from: string;
  date: string;
};

function rfc2822(input: { to: string; from?: string | null; subject: string; body: string }): string {
  const from = input.from?.trim() ? `From: ${input.from.trim()}\r\n` : "";
  return `${from}To: ${input.to.trim()}\r\nSubject: ${input.subject.replace(/\r?\n/g, " ")}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${input.body}`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

async function gmailFetch(path: string, init?: RequestInit) {
  const token = await liveAccessToken("gmail");
  if (!token) throw new Error("Gmail is not connected.");
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(err?.message || `Gmail API ${res.status}`);
  }
  return data;
}

export async function gmailIsReady(): Promise<boolean> {
  const row = await loadByoConnection("gmail");
  return Boolean(row?.connected && row.connectMode === "byo");
}

export async function listRecentGmail(limit = 5): Promise<GmailMessagePreview[]> {
  const listed = (await gmailFetch(`/messages?maxResults=${Math.min(10, Math.max(1, limit))}`)) as {
    messages?: { id: string }[];
  };
  const ids = (listed.messages ?? []).slice(0, limit);
  const out: GmailMessagePreview[] = [];
  for (const row of ids) {
    const msg = (await gmailFetch(
      `/messages/${encodeURIComponent(row.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    )) as {
      id?: string;
      payload?: { headers?: { name?: string; value?: string }[] };
    };
    const headers = msg.payload?.headers ?? [];
    const pick = (name: string) =>
      headers.find((h) => (h.name ?? "").toLowerCase() === name.toLowerCase())?.value ?? "";
    out.push({
      id: msg.id ?? row.id,
      subject: pick("Subject") || "(no subject)",
      from: pick("From"),
      date: pick("Date"),
    });
  }
  return out;
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string; to: string }> {
  const row = await loadByoConnection("gmail");
  const raw = toBase64Url(
    rfc2822({
      to: input.to,
      from: row?.tokenAccountEmail,
      subject: input.subject,
      body: input.body,
    }),
  );
  const sent = (await gmailFetch("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  })) as { id?: string };
  return { id: sent.id ?? "sent", to: input.to };
}
