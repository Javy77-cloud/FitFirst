import { plainFromInboxHtml } from "@/lib/desk/inbox-body";
import { decodeMailText, encodeMimeSubject } from "@/lib/desk/mail-text";
import type { MailInlineImage, MailThreadMessage, MailThreadPreview } from "./mail-contract";
import { gmailScopesAllowModify } from "./oauth-specs";
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

/** Gmail label ids stay on the vendor message. The desk reads MailThreadMessage. */
export type GmailThreadMessage = MailThreadMessage & { labelIds: string[] };

export type GmailInlineImage = MailInlineImage;

export type GmailPendingImage = {
  contentId: string;
  filename: string;
  mimeType: string;
  attachmentId: string | null;
  data: string | null;
  bytes: number;
};

const MAX_INLINE_IMAGE_BYTES = 1_500_000;

export type GmailThreadPreview = MailThreadPreview;

export type GmailComposeAttachment = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

function b64Utf8(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

/** Build RFC 2822 / MIME for Gmail raw send. Exported for unit tests. */
export function buildGmailRfc2822(input: {
  to: string;
  from?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  attachments?: GmailComposeAttachment[];
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const from = input.from?.trim() ? `From: ${input.from.trim()}\r\n` : "";
  const reply = input.inReplyTo?.trim() ? `In-Reply-To: ${input.inReplyTo.trim()}\r\n` : "";
  const refs = input.references?.trim() ? `References: ${input.references.trim()}\r\n` : "";
  const subject = `Subject: ${encodeMimeSubject(input.subject)}\r\n`;
  const head = `${from}To: ${input.to.trim()}\r\n${subject}${reply}${refs}`;
  const attachments = input.attachments?.filter((part) => part.contentBase64 && part.filename) ?? [];
  const htmlBody = (input.htmlBody ?? "").trim();
  const plainBody = input.body ?? "";

  if (!attachments.length && !htmlBody) {
    return (
      `${head}MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${b64Utf8(plainBody)}\r\n`
    );
  }

  const boundary = `ff_qc_${Date.now().toString(36)}`;
  const altBoundary = `ff_alt_${Date.now().toString(36)}`;
  // Blank line after headers is required so Gmail parses body parts (empty-body bug).
  const chunks: string[] = [
    `${head}MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`,
  ];

  if (htmlBody) {
    const plainForAlt = plainBody.trim() || plainFromInboxHtml(htmlBody) || htmlBody;
    // Prefer HTML that preserves paragraphs: if compose HTML has no breaks but
    // plain has newlines, render plain→HTML so Gmail shows line breaks.
    const htmlForAlt =
      /<(br|p|div|li)\b/i.test(htmlBody) || !plainForAlt.includes("\n")
        ? htmlBody
        : plainForAlt
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>\n");
    chunks.push(
      `--${boundary}\r\nContent-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`,
    );
    chunks.push(
      `--${altBoundary}\r\nContent-Type: text/plain; charset=utf-8\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n${b64Utf8(plainForAlt)}\r\n`,
    );
    chunks.push(
      `--${altBoundary}\r\nContent-Type: text/html; charset=utf-8\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n${b64Utf8(htmlForAlt)}\r\n`,
    );
    chunks.push(`--${altBoundary}--\r\n`);
  } else {
    chunks.push(
      `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n${b64Utf8(plainBody)}\r\n`,
    );
  }

  for (const part of attachments) {
    const mime = part.mimeType || "application/octet-stream";
    const safeName = part.filename.replace(/["\r\n]/g, "_");
    chunks.push(
      `--${boundary}\r\nContent-Type: ${mime}; name="${safeName}"\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-Disposition: attachment; filename="${safeName}"\r\n\r\n` +
        `${part.contentBase64}\r\n`,
    );
  }
  chunks.push(`--${boundary}--`);
  return chunks.join("");
}

/** @deprecated use buildGmailRfc2822 — kept as alias for any local callers */
function rfc2822(input: Parameters<typeof buildGmailRfc2822>[0]): string {
  return buildGmailRfc2822(input);
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
    throw new Error(err?.message ? `Gmail API ${res.status}: ${err.message}` : `Gmail API ${res.status}`);
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
    subject: decodeMailText(pickHeader(headers, "Subject")) || "(no subject)",
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

type GmailMimePart = {
  mimeType?: string;
  filename?: string;
  headers?: { name?: string; value?: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: unknown[];
};

function headerValue(part: GmailMimePart, name: string): string {
  return part.headers?.find((header) => (header.name ?? "").toLowerCase() === name.toLowerCase())?.value ?? "";
}

function contentIdOf(part: GmailMimePart): string {
  return headerValue(part, "Content-ID").replace(/^<|>$/g, "").trim();
}

/** Image parts (CID inline and normal attachments) without fetching bytes yet. */
export function collectGmailImages(part?: GmailMimePart): GmailPendingImage[] {
  const out: GmailPendingImage[] = [];
  const walk = (node?: GmailMimePart) => {
    if (!node) return;
    const mime = (node.mimeType ?? "").toLowerCase();
    if (mime.startsWith("image/")) {
      const data = node.body?.data ?? null;
      const bytes = node.body?.size ?? (data ? Math.floor((data.length * 3) / 4) : 0);
      out.push({
        contentId: contentIdOf(node),
        filename: node.filename?.trim() || contentIdOf(node) || "image",
        mimeType: mime,
        attachmentId: node.body?.attachmentId ?? null,
        data,
        bytes,
      });
    }
    for (const child of node.parts ?? []) walk(child as GmailMimePart);
  };
  walk(part);
  return out;
}

export function gmailImageDataUrl(mimeType: string, base64url: string): string {
  const mime = mimeType.toLowerCase().startsWith("image/") ? mimeType.toLowerCase() : "image/png";
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return `data:${mime};base64,${b64}`;
}

/** Plain text plus the HTML alternative. HTML is kept so the desk can wrap tables. */
export function gmailBodiesFromPart(part?: GmailMimePart): { plain: string; html: string } {
  let plain = "";
  let html = "";
  const walk = (node?: GmailMimePart) => {
    if (!node) return;
    if (!plain && node.mimeType === "text/plain" && node.body?.data) {
      plain = decodeGmailBody(node.body.data);
    }
    if (!html && node.mimeType === "text/html" && node.body?.data) {
      html = decodeGmailBody(node.body.data);
    }
    for (const child of node.parts ?? []) walk(child as GmailMimePart);
  };
  walk(part);
  return { plain: plain.trim(), html: html.trim() };
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
    payload?: GmailMimePart & { headers?: { name?: string; value?: string }[] };
  },
  agencyEmail: string | null,
): { message: GmailThreadMessage; pendingImages: GmailPendingImage[] } {
  const headers = gmailHeadersFrom(msg.payload);
  const labels = msg.labelIds ?? [];
  const extracted = gmailBodiesFromPart(msg.payload);
  const body = extracted.plain || plainFromInboxHtml(extracted.html) || (msg.snippet ?? "").trim();
  return {
    pendingImages: collectGmailImages(msg.payload),
    message: {
      id: msg.id ?? "",
      threadId: msg.threadId ?? "",
      from: headers.from,
      to: headers.to,
      cc: headers.cc,
      subject: headers.subject,
      date: headers.date,
      snippet: (msg.snippet ?? "").trim() || body.slice(0, 160),
      body: body.trim(),
      bodyHtml: extracted.html,
      images: [],
      unread: labels.includes("UNREAD"),
      inbound: isGmailInbound(labels, headers.from, agencyEmail),
      internalDate: Number(msg.internalDate ?? 0),
      messageId: headers.messageId,
      inReplyTo: headers.inReplyTo,
      references: headers.references,
      labelIds: labels,
    },
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
      subject: decodeMailText(pick("Subject")) || "(no subject)",
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
        const messages = (thread.messages ?? []).map((msg) => mapThreadMessage(msg, agencyEmail).message);
        return previewFromMessages(thread.id ?? row.id, thread.snippet ?? row.snippet ?? "", messages);
      }),
    );
    for (const preview of previews) {
      if (preview) out.push(preview);
    }
  }
  return out.sort((a, b) => b.lastInternalDate - a.lastInternalDate);
}

async function gmailAttachmentData(messageId: string, attachmentId: string): Promise<string | null> {
  const data = (await gmailFetch(
    `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  )) as { data?: string; size?: number };
  if ((data.size ?? 0) > MAX_INLINE_IMAGE_BYTES) return null;
  return data.data ?? null;
}

async function resolveMessageImages(
  message: GmailThreadMessage,
  pending: GmailPendingImage[],
): Promise<GmailThreadMessage> {
  const images: GmailInlineImage[] = [];
  for (const part of pending) {
    if (part.bytes > MAX_INLINE_IMAGE_BYTES) continue;
    let raw = part.data;
    if (!raw && part.attachmentId && message.id) {
      raw = await gmailAttachmentData(message.id, part.attachmentId).catch(() => null);
    }
    if (!raw) continue;
    if (Math.floor((raw.length * 3) / 4) > MAX_INLINE_IMAGE_BYTES) continue;
    images.push({
      contentId: part.contentId,
      filename: part.filename,
      dataUrl: gmailImageDataUrl(part.mimeType, raw),
    });
  }
  return {
    ...message,
    images,
  };
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
      payload?: GmailMimePart & { headers?: { name?: string; value?: string }[] };
    }[];
  };
  const mapped = (thread.messages ?? []).map((msg) => mapThreadMessage(msg, agencyEmail));
  const messages = await Promise.all(mapped.map((row) => resolveMessageImages(row.message, row.pendingImages)));
  const preview = previewFromMessages(thread.id ?? threadId, thread.snippet ?? "", messages);
  if (!preview) return null;
  return { preview, messages };
}

export async function markGmailThreadRead(
  threadId: string,
): Promise<{ ok: boolean; needsReconnect: boolean }> {
  const id = threadId.trim();
  if (!id) return { ok: false, needsReconnect: false };
  const row = await loadByoConnection("gmail");
  if (row?.grantedScopes && !gmailScopesAllowModify(row.grantedScopes)) {
    return { ok: false, needsReconnect: true };
  }
  try {
    await gmailFetch(`/threads/${encodeURIComponent(id)}/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    });
    return { ok: true, needsReconnect: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/insufficient|permission|scope|403|forbidden/i.test(message)) {
      return { ok: false, needsReconnect: true };
    }
    return { ok: false, needsReconnect: false };
  }
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string | null;
  attachments?: GmailComposeAttachment[];
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
      htmlBody: input.htmlBody,
      attachments: input.attachments,
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
