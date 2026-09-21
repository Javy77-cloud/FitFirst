import type { MailCompose, MailProvider } from "../mail-contract";

/**
 * Outlook mail slot. Calendar OAuth is not this mailbox.
 * When Graph mail BYO is real, set mailboxLive and fill list/get/mark/send.
 * getThread must return image bytes as data:image URLs (CID and attachments).
 * markThreadRead clears the vendor unread flag. The desk paints HTML and moves the Read band.
 */
async function outlookMailUnavailable(_input?: MailCompose): Promise<never> {
  throw new Error("Outlook mail is not connected.");
}

export const outlookMailProvider: MailProvider = {
  id: "outlook",
  label: "Outlook",
  mailboxLive: false,
  oauthId: null,

  async isReady() {
    return false;
  },

  async accountEmail() {
    return null;
  },

  async listThreads() {
    return [];
  },

  async getThread() {
    return null;
  },

  async markThreadRead() {
    return { ok: false, needsReconnect: false };
  },

  markReadReconnectCopy() {
    return null;
  },

  async scopesAllowMarkRead() {
    return false;
  },

  reply: outlookMailUnavailable,
  send: outlookMailUnavailable,
};
