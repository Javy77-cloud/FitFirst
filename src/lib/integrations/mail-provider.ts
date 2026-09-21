import { cache } from "react";
import type { MailProvider, MailProviderId } from "./mail-contract";
import { gmailMailProvider } from "./mail-providers/gmail";
import { outlookMailProvider } from "./mail-providers/outlook";
import { yahooMailProvider } from "./mail-providers/yahoo";
import { loadByoConnection } from "./oauth-store";

export type { MailCompose, MailInlineImage, MailMarkReadResult, MailProvider, MailProviderId, MailThread, MailThreadMessage, MailThreadPreview } from "./mail-contract";
export { mailThreadKey } from "./mail-contract";

const PROVIDERS: Record<MailProviderId, MailProvider> = {
  gmail: gmailMailProvider,
  outlook: outlookMailProvider,
  yahoo: yahooMailProvider,
};

/** Gmail first. Later live mailboxes join this list without a desk rewrite. */
const ORDER: MailProviderId[] = ["gmail", "outlook", "yahoo"];

export function listMailProviders(): MailProvider[] {
  return ORDER.map((id) => PROVIDERS[id]);
}

export function getMailProvider(id: MailProviderId): MailProvider {
  return PROVIDERS[id];
}

/** The mailbox Connect should offer: the first provider whose read/send path is real. */
export function inboxConnectTarget(): MailProvider {
  return listMailProviders().find((provider) => provider.mailboxLive) ?? gmailMailProvider;
}

/** Connected live mailbox, or null when the agency still needs Connect. */
export const activeInboxMail = cache(async (): Promise<MailProvider | null> => {
  for (const provider of listMailProviders()) {
    if (!provider.mailboxLive) continue;
    if (await provider.isReady().catch(() => false)) return provider;
  }
  return null;
});

/** BYO row for the inbox Connect wall. Outlook has no mail OAuth id yet. */
export async function inboxConnectRow(providerId: MailProviderId) {
  const oauthId = getMailProvider(providerId).oauthId;
  if (!oauthId) return null;
  return loadByoConnection(oauthId).catch(() => null);
}
