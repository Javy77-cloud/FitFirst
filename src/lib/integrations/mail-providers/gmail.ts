import { getGmailThread, gmailAccountEmail, gmailIsReady, listRecentGmailThreads, markGmailThreadRead, replyGmailThread, sendGmailMessage } from "../gmail";
import type { MailProvider } from "../mail-contract";
import { GMAIL_MARK_READ_RECONNECT, gmailScopesAllowModify } from "../oauth-specs";
import { loadByoConnection } from "../oauth-store";

/** Live mailbox. Vendor MIME and label calls stay here; the desk only sees MailProvider. */
export const gmailMailProvider: MailProvider = {
  id: "gmail",
  label: "Gmail",
  mailboxLive: true,
  oauthId: "gmail",

  isReady: gmailIsReady,
  accountEmail: gmailAccountEmail,
  listThreads: (limit = 20) => listRecentGmailThreads(limit),
  getThread: (threadId) => getGmailThread(threadId),
  markThreadRead: (threadId) => markGmailThreadRead(threadId),
  markReadReconnectCopy: () => GMAIL_MARK_READ_RECONNECT,

  async scopesAllowMarkRead() {
    const row = await loadByoConnection("gmail");
    if (row?.grantedScopes && !gmailScopesAllowModify(row.grantedScopes)) return false;
    return true;
  },

  async reply(input) {
    await replyGmailThread(input);
  },

  async send(input) {
    await sendGmailMessage(input);
  },
};
