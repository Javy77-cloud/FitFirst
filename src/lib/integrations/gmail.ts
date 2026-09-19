import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";

export type GmailMessagePreview = {
  id: string;
  subject: string;
  from: string;
  date: string;
};

export type GmailHeaderMap = {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  messageId: string;
  inReplyTo: string;
  references: string;
};

export type GmailThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  unread: boolean;
  inbound: boolean;
  internalDate: number;
  messageId: string;
  inReplyTo: string;
  references: string;
  labelIds: string[];
};

export type GmailThreadPreview = {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
  inboundLast: boolean;
  messageCount: number;
  lastMessageId: string;
  lastInternalDate: number;
  messageIdHeader: string;
  references: string;
};

function rfc2822(input: {
  to: string;
  from?: string | null;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const from = input.from?.trim() ? `From: ${input.from.trim()}\r\n` : "";
  const reply = input.inReplyTo?.trim() ? `In-Reply-To: ${input.inReplyTo.trim()}\r\n` : "";
  const refs = input.references?.trim() ? `References: ${input.references.trim()}\r\n` : "";
  return `${from}To: ${input.to.trim()}\r\nSubject: ${input.subject.replace(/\r?\n/g, " ")}\r\n${reply}${refs}Content-Type: text/plain; charset=utf-8\r\n\r\n${input.body}`;
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

export async function gmailAccountEmail(): Promise<string | null> {
  const row = await loadByoConnection("gmail");
  return row?.tokenAccountEmail?.trim().toLowerCase() || null;
}

function pickHeader(headers: { name?: string; value?: string }[] | undefined, name: string): string {
  return headers?.find((h) => (h.name ?? "").toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function gmailHeadersFrom(payload?: {
  headers?: { name?: string; value?: string }[];
}): GmailHeaderMap {
  const headers = payload?.headers ?? [];
  return {
    subject: pickHeader(headers, "Subject") || "(no subject)",
    from: pickHeader(headers, "From"),
    to: pickHeader(headers, "To"),
    cc: pickHeader(headers, "Cc"),
    date: pickHeader(headers, "Date"),
    messageId: pickHeader(headers, "Message-ID") || pickHeader(headers, "Message-Id"),
    inReplyTo: pickHeader(headers, "In-Reply-To"),
    references: pickHeader(headers, "References"),
  };
}

function decodeGmailBody(data: string | undefined): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function walkGmailParts(part?: {
  mimeType?: string;
  body?: { data?: string };
  parts?: unknown[];
}): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeGmailBody(part.body.data);
  for (const child of part.parts ?? []) {
    const text = walkGmailParts(child as { mimeType?: string; body?: { data?: string }; parts?: unknown[] });
    if (text) return text;
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeGmailBody(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ");
  }
  return "";
}

export function isGmailInbound(labelIds: string[] | undefined, from: string, agencyEmail: string | null): boolean {
  const labels = (labelIds ?? []).map((id) => id.toUpperCase());
  if (labels.includes("SENT") && !labels.includes("INBOX")) return false;
  if (!agencyEmail) return !labels.includes("SENT");
  const fromEmail = from.toLowerCase();
  return !fromEmail.includes(agencyEmail);
}

function mapThreadMessage(
  msg: {
    id?: string;
    threadId?: string;
    snippet?: string;
    internalDate?: string;
    labelIds?: string[];
    payload?: { headers?: { name?: string; value?: string }[]; mimeType?: string; body?: { data?: string }; parts?: unknown[] };
  },
  agencyEmail: string | null,
): GmailThreadMessage {
  const headers = gmailHeadersFrom(msg.payload);
  const labels = msg.labelIds ?? [];
  const body = walkGmailParts(msg.payload) || (msg.snippet ?? "").trim();
  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    from: headers.from,
    to: headers.to,
    cc: headers.cc,
    subject: headers.subject,
    date: headers.date,
    snippet: (msg.snippet ?? "").trim() || body.slice(0, 160),
    body: body.trim(),
    unread: labels.includes("UNREAD"),
    inbound: isGmailInbound(labels, headers.from, agencyEmail),
    internalDate: Number(msg.internalDate ?? 0),
    messageId: headers.messageId,
    inReplyTo: headers.inReplyTo,
    references: headers.references,
    labelIds: labels,
  };
}

function previewFromMessages(threadId: string, snippet: string, messages: GmailThreadMessage[]): GmailThreadPreview | null {
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  const first = messages[0];
  return {
    id: threadId,
    subject: last.subject || first.subject || "(no subject)",
    from: last.from || first.from,
    to: last.to || first.to,
    date: last.date || first.date,
    snippet: snippet.trim() || last.snippet,
    unread: messages.some((row) => row.unread),
    inboundLast: last.inbound,
    messageCount: messages.length,
    lastMessageId: last.id,
    lastInternalDate: last.internalDate,
    messageIdHeader: last.messageId,
    references: [last.references, last.messageId].filter(Boolean).join(" ").trim(),
  };
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

export async function listRecentGmailThreads(limit = 20): Promise<GmailThreadPreview[]> {
  const agencyEmail = await gmailAccountEmail();
  const listed = (await gmailFetch(
    `/threads?maxResults=${Math.min(25, Math.max(1, limit))}&q=${encodeURIComponent("in:inbox -category:promotions")}`,
  )) as { threads?: { id: string; snippet?: string }[] };
  const rows = (listed.threads ?? []).slice(0, limit);
  const out: GmailThreadPreview[] = [];
  const batch = 5;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const previews = await Promise.all(
      chunk.map(async (row) => {
        const thread = (await gmailFetch(
          `/threads/${encodeURIComponent(row.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date&metadataHeaders=Message-ID&metadataHeaders=In-Reply-To&metadataHeaders=References`,
        )) as {
          id?: string;
          snippet?: string;
          messages?: {
            id?: string;
            threadId?: string;
            snippet?: string;
            internalDate?: string;
            labelIds?: string[];
            payload?: { headers?: { name?: string; value?: string }[] };
          }[];
        };
        const messages = (thread.messages ?? []).map((msg) => mapThreadMessage(msg, agencyEmail));
        return previewFromMessages(thread.id ?? row.id, thread.snippet ?? row.snippet ?? "", messages);
      }),
    );
    for (const preview of previews) {
      if (preview) out.push(preview);
    }
  }
  return out.sort((a, b) => b.lastInternalDate - a.lastInternalDate);
}

export async function getGmailThread(threadId: string): Promise<{
  preview: GmailThreadPreview;
  messages: GmailThreadMessage[];
} | null> {
  const agencyEmail = await gmailAccountEmail();
  const thread = (await gmailFetch(`/threads/${encodeURIComponent(threadId)}?format=full`)) as {
    id?: string;
    snippet?: string;
    messages?: {
      id?: string;
      threadId?: string;
      snippet?: string;
      internalDate?: string;
      labelIds?: string[];
      payload?: { headers?: { name?: string; value?: string }[]; mimeType?: string; body?: { data?: string }; parts?: unknown[] };
    }[];
  };
  const messages = (thread.messages ?? []).map((msg) => mapThreadMessage(msg, agencyEmail));
  const preview = previewFromMessages(thread.id ?? threadId, thread.snippet ?? "", messages);
  if (!preview) return null;
  return { preview, messages };
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<{ id: string; to: string; threadId?: string }> {
  const row = await loadByoConnection("gmail");
  const raw = toBase64Url(
    rfc2822({
      to: input.to,
      from: row?.tokenAccountEmail,
      subject: input.subject,
      body: input.body,
      inReplyTo: input.inReplyTo,
      references: input.references,
    }),
  );
  const payload: Record<string, string> = { raw };
  if (input.threadId?.trim()) payload.threadId = input.threadId.trim();
  const sent = (await gmailFetch("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })) as { id?: string; threadId?: string };
  return { id: sent.id ?? "sent", to: input.to, threadId: sent.threadId ?? input.threadId };
}

export async function replyGmailThread(input: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<{ id: string; to: string; threadId?: string }> {
  const subject = /^(re|fwd|fw)\s*:/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;
  return sendGmailMessage({
    to: input.to,
    subject,
    body: input.body,
    threadId: input.threadId,
    inReplyTo: input.inReplyTo,
    references: input.references,
  });
}
