import { deskNow } from "@/lib/home/as-of";
import { inboxCuesFromThreads } from "@/lib/desk/inbox-desk";
import { encodePanelHref } from "@/lib/desk/inbox-assign";
import { loadLiveInboxThreads } from "@/lib/desk/load-inbox-live";
import { shouldSilenceInboxSignal } from "@/lib/desk/inbox-match";
import type { PanelCard } from "@/lib/notifications/panel";

export async function loadInboxMailSignals(asOf = deskNow()): Promise<PanelCard[]> {
  void asOf;
  const live = await loadLiveInboxThreads();
  if (!live.connected || live.threads.length === 0) return [];

  const cards: PanelCard[] = [];
  for (const row of live.threads) {
    const known = Boolean(row.match.contact || row.match.deal || row.match.renewal);
    if (!known) continue;
    if (!row.inboundLast) continue;
    if (
      shouldSilenceInboxSignal({
        inboundLast: row.inboundLast,
        quoteChasedRecently: false,
        renewalChasedRecently: false,
      })
    ) {
      continue;
    }
    const urgency = row.inboundLast && (row.match.deal || row.match.renewal) ? "high" : row.unread ? "medium" : "low";
    cards.push({
      key: `inbox_mail:${row.id}`,
      kind: "inbox_mail",
      urgency,
      entityLine: row.match.contact?.name || row.from,
      why: row.why,
      primary: {
        id: "open_inbox",
        label: "Open thread",
        href: row.href,
        action: "open_entity",
      },
      href: row.href,
      entityType: row.match.deal ? "deal" : row.match.renewal ? "policy" : "contact",
      entityId: row.match.deal?.id ?? row.match.renewal?.policyId ?? row.match.contact?.id ?? "",
      deadline: row.lastInternalDate ? new Date(row.lastInternalDate) : null,
      source: "live",
      contactId: row.match.contact?.id ?? null,
      dealId: row.match.deal?.id ?? null,
      policyId: row.match.renewal?.policyId ?? null,
      metaBody: encodePanelHref(row.href),
    });
  }
  return cards;
}

export async function loadInboxCues() {
  const live = await loadLiveInboxThreads();
  if (!live.connected) return [];
  return inboxCuesFromThreads(live.threads);
}
