import type { InboxMailProvider } from "@/lib/desk/inbox-skin";

/** Agency mailbox the inbox desk can drive. Gmail is live; Outlook and Yahoo share this contract. */
export type MailProviderId = InboxMailProvider;

export type MailInlineImage = {
  contentId: string;
  filename: string;
  dataUrl: string;
};

/** One message in the reading pane. Images are data URLs; the desk paints cid: and sanitizes HTML. */
export type MailThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  bodyHtml: string;
  images: MailInlineImage[];
  unread: boolean;
  inbound: boolean;
  internalDate: number;
  messageId: string;
  inReplyTo: string;
  references: string;
};

export type MailThreadPreview = {
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

export type MailThread = {
  preview: MailThreadPreview;
  messages: MailThreadMessage[];
};

export type MailMarkReadResult = {
  ok: boolean;
  needsReconnect: boolean;
};

export type MailCompose = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string | null;
  references?: string | null;
};

/**
 * One BYO mailbox. Implementations fetch vendor bytes.
 * The desk paints images, moves the Read band, and links contacts without knowing the vendor.
 */
export type MailProvider = {
  id: MailProviderId;
  label: string;
  /**
   * True only when list, read, images, mark-read, and send are real.
   * A connected identity (Yahoo OpenID, Outlook Calendar) is not a mailbox.
   */
  mailboxLive: boolean;
  /** OAuth provider id for Connect, when this mailbox has a BYO app. */
  oauthId: "gmail" | "yahoo" | null;
  isReady(): Promise<boolean>;
  accountEmail(): Promise<string | null>;
  listThreads(limit?: number): Promise<MailThreadPreview[]>;
  getThread(threadId: string): Promise<MailThread | null>;
  markThreadRead(threadId: string): Promise<MailMarkReadResult>;
  /** Shown when the stored grant cannot clear Unread. */
  markReadReconnectCopy(): string | null;
  /** False when stored scopes are known to block mark-read. Unknown scopes may still try the API. */
  scopesAllowMarkRead(): Promise<boolean>;
  reply(input: MailCompose & { threadId: string }): Promise<{ id: string; threadId?: string }>;
  send(input: MailCompose): Promise<{ id: string; threadId?: string }>;
};

/** Activity-log key. Gmail keeps the historical `gmail:` prefix. */
export function mailThreadKey(providerId: MailProviderId, threadId: string): string {
  return `${providerId}:${threadId.trim()}`;
}
