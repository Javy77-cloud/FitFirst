import { cache } from "react";
import { getGmailThread, gmailIsReady, listRecentGmailThreads, type GmailThreadMessage } from "@/lib/integrations/gmail";
import { flattenInboxBands, presentInboxThread, type InboxDeskThread } from "@/lib/desk/inbox-desk";
import { loadInboxMatchIndex } from "@/lib/desk/load-inbox-index";

export type LiveInboxIndex = {
  connected: boolean;
  threads: InboxDeskThread[];
  error: string | null;
};

export const loadLiveInboxThreads = cache(async (limit = 20): Promise<LiveInboxIndex> => {
  const connected = await gmailIsReady().catch(() => false);
  if (!connected) return { connected: false, threads: [], error: null };
  try {
    const [rows, index] = await Promise.all([listRecentGmailThreads(limit), loadInboxMatchIndex()]);
    return {
      connected: true,
      threads: flattenInboxBands(rows.map((row) => presentInboxThread(row, index))),
      error: null,
    };
  } catch (error) {
    return {
      connected: true,
      threads: [],
      error: error instanceof Error ? error.message : "Could not read Gmail.",
    };
  }
});

export const loadInboxThreadMessages = cache(async (threadId: string | null): Promise<GmailThreadMessage[]> => {
  if (!threadId) return [];
  const loaded = await getGmailThread(threadId).catch(() => null);
  return loaded?.messages ?? [];
});
