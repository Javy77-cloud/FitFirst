/** Work vs Inbox lanes for the Notification Panel. */

import {
  PANEL_EMPTY_INBOX,
  PANEL_EMPTY_WORK,
  PANEL_SIGNAL_KINDS,
  type PanelCard,
  type PanelSignalKind,
} from "@/lib/notifications/panel";

export const PANEL_LANES = ["work", "inbox"] as const;
export type PanelLane = (typeof PANEL_LANES)[number];

export const PANEL_LANE_META: Record<
  PanelLane,
  { label: string; hint: string; empty: string }
> = {
  work: {
    label: "Work",
    hint: "Actionable FitFirst chores — renewals, docs, AOR, quotes, promises.",
    empty: PANEL_EMPTY_WORK,
  },
  inbox: {
    label: "Inbox",
    hint: "Inbound / awareness — term starts, agency mail, carrier notices.",
    empty: PANEL_EMPTY_INBOX,
  },
};

/** Kinds that belong on the Inbox awareness lane. Everything else is Work. */
export const PANEL_INBOX_KINDS = ["inbox_mail", "renewal_term_started"] as const satisfies readonly PanelSignalKind[];

const INBOX_KIND_SET = new Set<string>(PANEL_INBOX_KINDS);

export function panelLaneForKind(kind: PanelSignalKind | string): PanelLane {
  return INBOX_KIND_SET.has(kind) ? "inbox" : "work";
}

export function isPanelInboxKind(kind: string | null | undefined): boolean {
  return Boolean(kind && INBOX_KIND_SET.has(kind));
}

export function parsePanelLane(value: string | null | undefined): PanelLane {
  if (value === "inbox") return "inbox";
  return "work";
}

export function filterCardsByLane(cards: readonly PanelCard[], lane: PanelLane): PanelCard[] {
  return cards.filter((card) => panelLaneForKind(card.kind) === lane);
}

export function countCardsByLane(cards: readonly PanelCard[]): Record<PanelLane, number> {
  const counts: Record<PanelLane, number> = { work: 0, inbox: 0 };
  for (const card of cards) {
    counts[panelLaneForKind(card.kind)] += 1;
  }
  return counts;
}

export function panelLaneHref(lane: PanelLane): string {
  return lane === "inbox" ? "/notifications?lane=inbox" : "/notifications?lane=work";
}

/** Sanity: every known panel kind maps to a lane without falling through. */
export function allPanelKindsHaveLanes(): boolean {
  return PANEL_SIGNAL_KINDS.every((kind) => panelLaneForKind(kind) === "work" || panelLaneForKind(kind) === "inbox");
}
