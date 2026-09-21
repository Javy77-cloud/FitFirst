import { cache } from "react";
import { paintInboxMessage } from "@/lib/desk/inbox-body";
import { flattenInboxBands, presentInboxThread, type InboxDeskThread } from "@/lib/desk/inbox-desk";
import { loadInboxMatchIndex } from "@/lib/desk/load-inbox-index";
import type { InboxMailProvider } from "@/lib/desk/inbox-skin";
import { activeInboxMail, inboxConnectTarget, type MailThreadMessage } from "@/lib/integrations/mail-provider";

export type LiveInboxIndex = {
  providerId: InboxMailProvider;
  label: string;
  connected: boolean;
  threads: InboxDeskThread[];
  error: string | null;
};

export const loadLiveInboxThreads = cache(async (limit = 20): Promise<LiveInboxIndex> => {
  const mail = await activeInboxMail();
  const fallback = inboxConnectTarget();
  if (!mail) {
    return { providerId: fallback.id, label: fallback.label, connected: false, threads: [], error: null };
  }
  try {
    const [rows, index] = await Promise.all([mail.listThreads(limit), loadInboxMatchIndex()]);
    return {
      providerId: mail.id,
      label: mail.label,
      connected: true,
      threads: flattenInboxBands(rows.map((row) => presentInboxThread(row, index))),
      error: null,
    };
  } catch (error) {
    return {
      providerId: mail.id,
      label: mail.label,
      connected: true,
      threads: [],
      error: error instanceof Error ? error.message : `Could not read ${mail.label}.`,
    };
  }
});

/** Full thread for the reading pane. Every provider's images are painted here, not in the vendor client. */
export const loadInboxThreadMessages = cache(async (threadId: string | null): Promise<MailThreadMessage[]> => {
  if (!threadId) return [];
  const mail = await activeInboxMail();
  if (!mail) return [];
  const loaded = await mail.getThread(threadId).catch(() => null);
  return (loaded?.messages ?? []).map((message) => paintInboxMessage(message));
});
