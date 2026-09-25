import { OPEN_DEAL_STAGES } from "@/lib/home/kpis";
import { agentIdsForTerritory } from "@/lib/org/book-scope";

/** Written lines Admin can pin on a routing rule. Empty = any line. */
export const ROUTING_LINES = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "GL",
  "BOP",
  "LIFE",
  "HEALTH",
  "RV",
  "WC",
] as const;
export type RoutingLine = (typeof ROUTING_LINES)[number];

export const ROUTING_LINE_LABEL: Record<RoutingLine, string> = {
  HO: "Home",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  GL: "GL",
  BOP: "BOP",
  LIFE: "Life",
  HEALTH: "Health",
  RV: "Rec / RV",
  WC: "Workers Comp",
};

const LINE_ALIASES: Record<string, RoutingLine> = {
  ho: "HO",
  ho3: "HO",
  ho8: "HO",
  mh: "HO",
  mho: "HO",
  mdp: "HO",
  home: "HO",
  homeowners: "HO",
  homeowner: "HO",
  dwelling: "HO",
  dp3: "HO",
  auto: "AUTO",
  pa: "AUTO",
  personalauto: "AUTO",
  motorcycle: "AUTO",
  ca: "AUTO",
  commercialauto: "AUTO",
  car: "AUTO",
  vehicle: "AUTO",
  flood: "FLOOD",
  nfip: "FLOOD",
  umbrella: "UMBRELLA",
  pup: "UMBRELLA",
  gl: "GL",
  generalliability: "GL",
  liability: "GL",
  eo: "GL",
  errorsandomissions: "GL",
  errorsomissions: "GL",
  bop: "BOP",
  life: "LIFE",
  health: "HEALTH",
  medicare: "HEALTH",
  rv: "RV",
  rec: "RV",
  boat: "RV",
  watercraft: "RV",
  wc: "WC",
  workerscomp: "WC",
  workerscompensation: "WC",
};

export type RoutingRule = {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  territoryId: string | null;
  writtenLine: string | null;
  maxOpenDeals: number;
  producerId: string | null;
};

export type RoutingTerritory = {
  id: string;
  name: string;
  states: string[];
  counties: string[];
  geoLabel: string | null;
};

export type RoutingProducer = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  accessStatus: string;
  openDealCount: number;
};

export type LeadRouteFacts = {
  state?: string | null;
  city?: string | null;
  insuranceTypeDesired?: string | null;
};

export type RouteDecision =
  | {
      outcome: "assigned";
      producerId: string;
      producerName: string;
      ruleId: string;
      ruleName: string;
      reason: string;
    }
  | {
      outcome: "unassigned";
      producerId: null;
      producerName: null;
      ruleId: null;
      ruleName: null;
      reason: string;
    };

export function isOpenDealStage(stage: string | null | undefined): boolean {
  return OPEN_DEAL_STAGES.has((stage ?? "").toLowerCase());
}

export function normalizeWrittenLine(raw: string | null | undefined): RoutingLine | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if ((ROUTING_LINES as readonly string[]).includes(value.toUpperCase())) {
    return value.toUpperCase() as RoutingLine;
  }
  const key = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return LINE_ALIASES[key] ?? null;
}

export function parseRoutingLine(raw: string | null | undefined): RoutingLine | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  return normalizeWrittenLine(value);
}

export function leadMatchesTerritory(
  lead: LeadRouteFacts,
  territory: Pick<RoutingTerritory, "states" | "counties" | "geoLabel" | "name">,
): boolean {
  const state = (lead.state ?? "").trim().toUpperCase();
  const city = (lead.city ?? "").trim().toLowerCase();
  if (state && territory.states.some((item) => item.toUpperCase() === state)) {
    return true;
  }
  const geo = `${territory.geoLabel ?? ""} ${territory.name}`.toLowerCase();
  if (city && geo && geo.includes(city)) return true;
  return false;
}

export function ruleMatchesLead(
  rule: RoutingRule,
  lead: LeadRouteFacts,
  territories: RoutingTerritory[],
): boolean {
  if (!rule.enabled) return false;
  const leadLine = normalizeWrittenLine(lead.insuranceTypeDesired);
  const ruleLine = parseRoutingLine(rule.writtenLine);
  if (ruleLine && leadLine !== ruleLine) return false;
  if (rule.territoryId) {
    const territory = territories.find((row) => row.id === rule.territoryId);
    if (!territory) return false;
    if (!leadMatchesTerritory(lead, territory)) return false;
  }
  return true;
}

export function isRoutableProducer(producer: RoutingProducer): boolean {
  if (!producer.active) return false;
  const status = (producer.accessStatus ?? "active").toLowerCase();
  return status === "active";
}

export function producersForRule(
  rule: RoutingRule,
  producers: RoutingProducer[],
  membership: {
    officeMemberships: { userId: string; officeId: string }[];
    territoryMemberships: { userId: string; territoryId: string }[];
    territoryOfficeLinks: { territoryId: string; officeId: string }[];
  },
): RoutingProducer[] {
  const active = producers.filter(isRoutableProducer);
  if (rule.producerId) {
    return active.filter((row) => row.id === rule.producerId);
  }
  if (!rule.territoryId) return active;
  const linkedOfficeIds = membership.territoryOfficeLinks
    .filter((row) => row.territoryId === rule.territoryId)
    .map((row) => row.officeId);
  const allowed = new Set(
    agentIdsForTerritory({
      territoryId: rule.territoryId,
      linkedOfficeIds,
      officeMemberships: membership.officeMemberships,
      territoryMemberships: membership.territoryMemberships,
    }),
  );
  return active.filter((row) => allowed.has(row.id));
}

export function pickProducerByCapacity(
  candidates: RoutingProducer[],
  maxOpenDeals: number,
): RoutingProducer | null {
  const cap = Number.isFinite(maxOpenDeals) ? maxOpenDeals : 0;
  const under = candidates
    .filter((row) => row.openDealCount < cap)
    .slice()
    .sort((a, b) => a.openDealCount - b.openDealCount || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return under[0] ?? null;
}

export function routeLead(input: {
  lead: LeadRouteFacts;
  rules: RoutingRule[];
  producers: RoutingProducer[];
  territories: RoutingTerritory[];
  officeMemberships: { userId: string; officeId: string }[];
  territoryMemberships: { userId: string; territoryId: string }[];
  territoryOfficeLinks: { territoryId: string; officeId: string }[];
}): RouteDecision {
  const rules = input.rules
    .filter((rule) => rule.enabled)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  if (rules.length === 0) {
    return {
      outcome: "unassigned",
      producerId: null,
      producerName: null,
      ruleId: null,
      ruleName: null,
      reason: "No enabled routing rules. Posted to the lead-offer board.",
    };
  }

  let sawMatch = false;
  let capacityBlocked = false;
  for (const rule of rules) {
    if (!ruleMatchesLead(rule, input.lead, input.territories)) continue;
    sawMatch = true;
    const candidates = producersForRule(rule, input.producers, {
      officeMemberships: input.officeMemberships,
      territoryMemberships: input.territoryMemberships,
      territoryOfficeLinks: input.territoryOfficeLinks,
    });
    const pick = pickProducerByCapacity(candidates, rule.maxOpenDeals);
    if (pick) {
      const line = normalizeWrittenLine(input.lead.insuranceTypeDesired);
      const territory = rule.territoryId
        ? input.territories.find((row) => row.id === rule.territoryId)?.name
        : null;
      const parts = [
        rule.name,
        territory ? `${territory} territory` : null,
        line ? ROUTING_LINE_LABEL[line] : null,
        `${pick.openDealCount} open deals (cap ${rule.maxOpenDeals})`,
      ].filter(Boolean);
      return {
        outcome: "assigned",
        producerId: pick.id,
        producerName: pick.name,
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `Routed to ${pick.name} — ${parts.join(" · ")}.`,
      };
    }
    if (candidates.length > 0) capacityBlocked = true;
  }

  const reason = !sawMatch
    ? "No routing rule matched this territory and written line. Posted to the lead-offer board."
    : capacityBlocked
      ? "Matching producers are at capacity. Posted to the lead-offer board."
      : "No producer sits in the matching territory. Posted to the lead-offer board.";

  return {
    outcome: "unassigned",
    producerId: null,
    producerName: null,
    ruleId: null,
    ruleName: null,
    reason,
  };
}

export function countOpenDealsByOwner(deals: { ownerId?: string | null; pipelineStage: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.ownerId || !isOpenDealStage(deal.pipelineStage)) continue;
    counts.set(deal.ownerId, (counts.get(deal.ownerId) ?? 0) + 1);
  }
  return counts;
}
