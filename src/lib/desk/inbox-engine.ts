import { markDeskThreadRead, type InboxDeskThread } from "@/lib/desk/inbox-desk";
import { loadInboxThreadMessages, loadLiveInboxThreads } from "@/lib/desk/load-inbox-live";
import type { InboxMailProvider } from "@/lib/desk/inbox-skin";
import { ensureMatchedThreadLogged } from "@/lib/desk/inbox-autolog";
import { currentDeskSession } from "@/lib/auth/session";
import { activeInboxMail, inboxConnectRow, inboxConnectTarget, type MailThreadMessage } from "@/lib/integrations/mail-provider";

export type InboxDeskLoad = {
  providerId: InboxMailProvider;
  label: string;
  connectLabel: string;
  connectOauthId: "gmail" | "yahoo";
  connected: boolean;
  threads: InboxDeskThread[];
  messages: MailThreadMessage[];
  accountEmail: string | null;
  error: string | null;
  markReadNotice: string | null;
  oauthError: string | null;
};

/**
 * One inbox load for whichever mailbox is live.
 * Opening a thread asks that provider to clear Unread, then the shared band move runs.
 * Matched threads auto-log inbound replies onto CRM activity (idempotent).
 */
export async function loadInboxDesk(selectedId: string | null): Promise<InboxDeskLoad> {
  const connect = inboxConnectTarget();
  const [mail, live, connectRow, session] = await Promise.all([
    activeInboxMail(),
    loadLiveInboxThreads(20),
    inboxConnectRow(connect.id),
    currentDeskSession().catch(() => null),
  ]);
  const opened = selectedId ? live.threads.find((row) => row.id === selectedId) : null;
  const selectedThread = opened ?? live.threads[0] ?? null;
  const [accountEmail, messages, allowMarkRead] = await Promise.all([
    mail ? mail.accountEmail().catch(() => null) : Promise.resolve(null),
    live.connected ? loadInboxThreadMessages(selectedThread?.id ?? null) : Promise.resolve([]),
    mail && opened?.unread ? mail.scopesAllowMarkRead() : Promise.resolve(true),
  ]);
  const grantMissing = Boolean(mail && opened?.unread && !allowMarkRead);
  const marked =
    mail && live.connected && opened?.unread && !grantMissing ? await mail.markThreadRead(opened.id) : null;
  const threads = selectedId ? markDeskThreadRead(live.threads, selectedId) : live.threads;
  const markReadNotice = grantMissing || marked?.needsReconnect ? (mail?.markReadReconnectCopy() ?? null) : null;

  if (mail && selectedThread && messages.length > 0 && !selectedThread.match.unmatched) {
    await ensureMatchedThreadLogged({
      providerId: mail.id,
      threadId: selectedThread.id,
      messages,
      match: selectedThread.match,
      sessionUserId: session?.userId ?? null,
      inboundOnly: true,
    }).catch(() => null);
  }

  return {
    providerId: live.providerId,
    label: live.label,
    connectLabel: connect.label,
    connectOauthId: connect.oauthId ?? "gmail",
    connected: live.connected,
    threads,
    messages,
    accountEmail,
    error: live.error,
    markReadNotice,
    oauthError: connectRow?.lastOauthError ?? null,
  };
}
