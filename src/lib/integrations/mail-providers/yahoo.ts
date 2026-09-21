import type { MailCompose, MailProvider } from "../mail-contract";

/**
 * Yahoo identity OAuth is real. Yahoo Mail REST is not, so this stays dark.
 * When read/send exists, set mailboxLive and return the same thread, image, and mark-read shapes as Gmail.
 */
async function yahooMailUnavailable(_input?: MailCompose): Promise<never> {
  throw new Error("Yahoo Mail is not a live mailbox yet.");
}

export const yahooMailProvider: MailProvider = {
  id: "yahoo",
  label: "Yahoo",
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

  reply: yahooMailUnavailable,
  send: yahooMailUnavailable,
};
