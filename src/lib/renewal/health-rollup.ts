import { averageHealthStars } from "@/lib/renewal/health";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

export type ClientHealthRollup = {
  partyKey: string;
  clientName: string;
  stars: number;
  flagged: boolean;
  ownerId: string | null;
  ownerName: string | null;
};

export type AgentHealthRollup = {
  ownerId: string;
  ownerName: string;
  stars: number;
  flagged: number;
  clients: number;
};

export type RoleHealthSummary = {
  scope: "agent" | "agency";
  label: string;
  combinedStars: number | null;
  flagged: number;
  clients: number;
  perClient: ClientHealthRollup[];
  perAgent: AgentHealthRollup[];
};

function uniqueClients(cards: RenewalBoardCard[]): ClientHealthRollup[] {
  const byParty = new Map<string, ClientHealthRollup>();
  for (const card of cards) {
    const key = card.partyKey || card.policyId;
    const existing = byParty.get(key);
    if (existing) continue;
    byParty.set(key, {
      partyKey: key,
      clientName: card.clientName,
      stars: card.healthStars,
      flagged: card.healthFlagged,
      ownerId: card.ownerId,
      ownerName: card.ownerName,
    });
  }
  return [...byParty.values()];
}

/** Agents: own book + per-client. Owners: agency-wide + per-agent. Never per-policy primary. */
export function roleHealthSummary(input: {
  cards: RenewalBoardCard[];
  isOwner: boolean;
  viewerId: string | null;
  viewerName: string;
}): RoleHealthSummary {
  const scoped = input.isOwner
    ? input.cards
    : input.viewerId
      ? input.cards.filter((card) => !card.ownerId || card.ownerId === input.viewerId)
      : input.cards;
  const perClient = uniqueClients(scoped);
  const combinedStars = averageHealthStars(perClient.map((row) => row.stars));
  const flagged = perClient.filter((row) => row.flagged).length;

  if (!input.isOwner) {
    return {
      scope: "agent",
      label: `${input.viewerName || "Your"} book`,
      combinedStars,
      flagged,
      clients: perClient.length,
      perClient,
      perAgent: [],
    };
  }

  const byAgent = new Map<string, ClientHealthRollup[]>();
  for (const row of perClient) {
    const key = row.ownerId || "unassigned";
    const list = byAgent.get(key) ?? [];
    list.push(row);
    byAgent.set(key, list);
  }
  const perAgent: AgentHealthRollup[] = [...byAgent.entries()].map(([ownerId, rows]) => ({
    ownerId,
    ownerName: rows[0]?.ownerName || (ownerId === "unassigned" ? "Unassigned" : "Agent"),
    stars: averageHealthStars(rows.map((row) => row.stars)) ?? 0,
    flagged: rows.filter((row) => row.flagged).length,
    clients: rows.length,
  }));
  perAgent.sort((a, b) => a.stars - b.stars || b.flagged - a.flagged);

  return {
    scope: "agency",
    label: "Agency book",
    combinedStars,
    flagged,
    clients: perClient.length,
    perClient,
    perAgent,
  };
}
