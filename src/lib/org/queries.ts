import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  offices,
  territories,
  territoryOffices,
  userOffices,
  userTerritories,
  users,
} from "@/lib/db/schema";
import {
  bookScopeLabel,
  bookScopeOptions,
  parseBookScopeParam,
  resolveBookAgentIds,
  type BookScopeInput,
  type BookScopeOption,
} from "./book-scope";

const tenant = () => DEFAULT_TENANT_ID;

/** Drizzle alias so primary-office joins stay unambiguous for other bots. */
const primaryOffice = alias(offices, "primary_office");

export async function listOffices() {
  return db
    .select()
    .from(offices)
    .where(eq(offices.tenantId, tenant()))
    .orderBy(asc(offices.name));
}

export async function listTerritories() {
  return db
    .select()
    .from(territories)
    .where(eq(territories.tenantId, tenant()))
    .orderBy(asc(territories.name));
}

export async function listDeskAgents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.tenantId, tenant()))
    .orderBy(asc(users.name));
}

export async function listUserOffices() {
  return db
    .select()
    .from(userOffices)
    .where(eq(userOffices.tenantId, tenant()));
}

export async function listUserTerritories() {
  return db
    .select()
    .from(userTerritories)
    .where(eq(userTerritories.tenantId, tenant()));
}

export async function listTerritoryOffices() {
  return db
    .select()
    .from(territoryOffices)
    .where(eq(territoryOffices.tenantId, tenant()));
}

export type AgentRosterRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  officeIds: string[];
  officeNames: string[];
  primaryOfficeId: string | null;
  primaryOfficeName: string | null;
  territoryIds: string[];
  territoryNames: string[];
};

export async function listAgentRoster(): Promise<AgentRosterRow[]> {
  const [agents, officeRows, officeLinks, territoryRows, territoryLinks, primaryLinks] =
    await Promise.all([
      listDeskAgents(),
      listOffices(),
      listUserOffices(),
      listTerritories(),
      listUserTerritories(),
      db
        .select({
          userId: userOffices.userId,
          officeId: primaryOffice.id,
          officeName: primaryOffice.name,
        })
        .from(userOffices)
        .innerJoin(primaryOffice, eq(userOffices.officeId, primaryOffice.id))
        .where(and(eq(userOffices.tenantId, tenant()), eq(userOffices.isPrimary, true))),
    ]);

  const officeById = new Map(officeRows.map((row) => [row.id, row.name]));
  const territoryById = new Map(territoryRows.map((row) => [row.id, row.name]));
  const primaryByUser = new Map(primaryLinks.map((row) => [row.userId, row]));

  return agents.map((agent) => {
    const officesForAgent = officeLinks.filter((row) => row.userId === agent.id);
    const territoriesForAgent = territoryLinks.filter((row) => row.userId === agent.id);
    const primary = primaryByUser.get(agent.id) ?? null;
    return {
      userId: agent.id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      officeIds: officesForAgent.map((row) => row.officeId),
      officeNames: officesForAgent
        .map((row) => officeById.get(row.officeId))
        .filter((name): name is string => Boolean(name)),
      primaryOfficeId: primary?.officeId ?? null,
      primaryOfficeName: primary?.officeName ?? null,
      territoryIds: territoriesForAgent.map((row) => row.territoryId),
      territoryNames: territoriesForAgent
        .map((row) => territoryById.get(row.territoryId))
        .filter((name): name is string => Boolean(name)),
    };
  });
}

export async function loadOrgCatalog() {
  const [officeRows, territoryRows, officeLinks, territoryLinks, territoryOfficeLinks, agents] =
    await Promise.all([
      listOffices(),
      listTerritories(),
      listUserOffices(),
      listUserTerritories(),
      listTerritoryOffices(),
      listDeskAgents(),
    ]);
  return {
    offices: officeRows,
    territories: territoryRows,
    officeMemberships: officeLinks.map((row) => ({ userId: row.userId, officeId: row.officeId })),
    territoryMemberships: territoryLinks.map((row) => ({
      userId: row.userId,
      territoryId: row.territoryId,
    })),
    territoryOfficeLinks: territoryOfficeLinks.map((row) => ({
      territoryId: row.territoryId,
      officeId: row.officeId,
    })),
    agents,
  };
}

/** Hook other bots call: Admin office / territory / company-wide agent ids. */
export async function resolveBookScope(raw: string | null | undefined): Promise<{
  scope: BookScopeInput;
  agentIds: string[] | null;
  label: string;
  options: BookScopeOption[];
}> {
  const catalog = await loadOrgCatalog();
  const scope = parseBookScopeParam(raw);
  const agentIds = resolveBookAgentIds({
    scope,
    officeMemberships: catalog.officeMemberships,
    territoryMemberships: catalog.territoryMemberships,
    territoryOfficeLinks: catalog.territoryOfficeLinks,
  });
  return {
    scope,
    agentIds,
    label: bookScopeLabel(scope, catalog),
    options: bookScopeOptions(catalog),
  };
}

export async function listBookScopeOptions(): Promise<BookScopeOption[]> {
  const catalog = await loadOrgCatalog();
  return bookScopeOptions(catalog);
}
