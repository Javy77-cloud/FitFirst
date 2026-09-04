import { isUuid } from "@/lib/ids";

/** Admin book lens. Other desk bots should call these helpers instead of inventing a second filter. */
export const BOOK_SCOPE_KINDS = ["company", "office", "territory"] as const;
export type BookScopeKind = (typeof BOOK_SCOPE_KINDS)[number];

export type BookScopeInput = {
  kind: BookScopeKind;
  officeId?: string | null;
  territoryId?: string | null;
};

export type BookScopeOption = {
  value: string;
  label: string;
  kind: BookScopeKind;
};

export type OfficeMembership = { userId: string; officeId: string };
export type TerritoryMembership = { userId: string; territoryId: string };

export const COMPANY_BOOK_SCOPE: BookScopeInput = { kind: "company" };

export function parseBookScopeParam(raw: string | null | undefined): BookScopeInput {
  const value = (raw ?? "").trim();
  if (!value || value === "company") return { kind: "company" };
  if (value.startsWith("office:")) {
    const officeId = value.slice("office:".length);
    return isUuid(officeId) ? { kind: "office", officeId } : { kind: "company" };
  }
  if (value.startsWith("territory:")) {
    const territoryId = value.slice("territory:".length);
    return isUuid(territoryId) ? { kind: "territory", territoryId } : { kind: "company" };
  }
  return { kind: "company" };
}

export function bookScopeQueryValue(scope: BookScopeInput): string {
  if (scope.kind === "office" && scope.officeId && isUuid(scope.officeId)) {
    return `office:${scope.officeId}`;
  }
  if (scope.kind === "territory" && scope.territoryId && isUuid(scope.territoryId)) {
    return `territory:${scope.territoryId}`;
  }
  return "company";
}

export function isCompanyBookScope(scope: BookScopeInput): boolean {
  return bookScopeQueryValue(scope) === "company";
}

export function agentIdsForOffice(
  officeId: string,
  memberships: OfficeMembership[],
): string[] {
  return uniqueIds(memberships.filter((row) => row.officeId === officeId).map((row) => row.userId));
}

/** Territory agents = direct assignments ∪ agents in linked offices. */
export function agentIdsForTerritory(input: {
  territoryId: string;
  linkedOfficeIds: string[];
  officeMemberships: OfficeMembership[];
  territoryMemberships: TerritoryMembership[];
}): string[] {
  const fromOffices = input.officeMemberships
    .filter((row) => input.linkedOfficeIds.includes(row.officeId))
    .map((row) => row.userId);
  const direct = input.territoryMemberships
    .filter((row) => row.territoryId === input.territoryId)
    .map((row) => row.userId);
  return uniqueIds([...fromOffices, ...direct]);
}

/**
 * Null agent list = company-wide (do not filter).
 * Empty array = scoped but nobody sits there (return no rows).
 */
export function resolveBookAgentIds(input: {
  scope: BookScopeInput;
  officeMemberships: OfficeMembership[];
  territoryMemberships: TerritoryMembership[];
  territoryOfficeLinks: { territoryId: string; officeId: string }[];
}): string[] | null {
  if (input.scope.kind === "office" && input.scope.officeId) {
    return agentIdsForOffice(input.scope.officeId, input.officeMemberships);
  }
  if (input.scope.kind === "territory" && input.scope.territoryId) {
    const linkedOfficeIds = input.territoryOfficeLinks
      .filter((row) => row.territoryId === input.scope.territoryId)
      .map((row) => row.officeId);
    return agentIdsForTerritory({
      territoryId: input.scope.territoryId,
      linkedOfficeIds,
      officeMemberships: input.officeMemberships,
      territoryMemberships: input.territoryMemberships,
    });
  }
  return null;
}

export function filterByBookScope<T extends { ownerId?: string | null }>(
  rows: T[],
  agentIds: string[] | null,
): T[] {
  if (agentIds == null) return rows;
  const allowed = new Set(agentIds);
  return rows.filter((row) => row.ownerId != null && allowed.has(row.ownerId));
}

export function bookScopeLabel(
  scope: BookScopeInput,
  catalogs: {
    offices: { id: string; name: string }[];
    territories: { id: string; name: string }[];
  },
): string {
  if (scope.kind === "office" && scope.officeId) {
    const office = catalogs.offices.find((row) => row.id === scope.officeId);
    return office ? `${office.name} office` : "Office";
  }
  if (scope.kind === "territory" && scope.territoryId) {
    const territory = catalogs.territories.find((row) => row.id === scope.territoryId);
    return territory ? `${territory.name} territory` : "Territory";
  }
  return "Company-wide";
}

export function bookScopeOptions(catalogs: {
  offices: { id: string; name: string }[];
  territories: { id: string; name: string }[];
}): BookScopeOption[] {
  return [
    { value: "company", label: "Company-wide", kind: "company" },
    ...catalogs.offices.map((office) => ({
      value: `office:${office.id}`,
      label: `${office.name} office`,
      kind: "office" as const,
    })),
    ...catalogs.territories.map((territory) => ({
      value: `territory:${territory.id}`,
      label: `${territory.name} territory`,
      kind: "territory" as const,
    })),
  ];
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
