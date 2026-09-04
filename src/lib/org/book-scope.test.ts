import { describe, expect, it } from "vitest";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  OFFICE_PALM_BAY_ID,
  OFFICE_SAVANNAH_ID,
  TERRITORY_SPACE_COAST_ID,
} from "@/lib/fixtures/ids";
import {
  agentIdsForOffice,
  agentIdsForTerritory,
  bookScopeLabel,
  bookScopeQueryValue,
  filterByBookScope,
  parseBookScopeParam,
  resolveBookAgentIds,
} from "./book-scope";

const officeMemberships = [
  { userId: ADMIN_USER_ID, officeId: OFFICE_PALM_BAY_ID },
  { userId: ADMIN_USER_ID, officeId: OFFICE_SAVANNAH_ID },
  { userId: AGENT_USER_ID, officeId: OFFICE_PALM_BAY_ID },
];

describe("admin book scope helpers", () => {
  it("parses company / office / territory query values", () => {
    expect(parseBookScopeParam(undefined)).toEqual({ kind: "company" });
    expect(parseBookScopeParam("company")).toEqual({ kind: "company" });
    expect(parseBookScopeParam(`office:${OFFICE_PALM_BAY_ID}`)).toEqual({
      kind: "office",
      officeId: OFFICE_PALM_BAY_ID,
    });
    expect(parseBookScopeParam(`territory:${OFFICE_PALM_BAY_ID}`)).toEqual({
      kind: "territory",
      territoryId: OFFICE_PALM_BAY_ID,
    });
    expect(parseBookScopeParam("office:not-a-uuid")).toEqual({ kind: "company" });
    expect(bookScopeQueryValue({ kind: "office", officeId: OFFICE_PALM_BAY_ID })).toBe(
      `office:${OFFICE_PALM_BAY_ID}`,
    );
  });

  it("resolves Palm Bay to Javy + Maya and Savannah to Javy only", () => {
    expect(agentIdsForOffice(OFFICE_PALM_BAY_ID, officeMemberships).sort()).toEqual(
      [ADMIN_USER_ID, AGENT_USER_ID].sort(),
    );
    expect(agentIdsForOffice(OFFICE_SAVANNAH_ID, officeMemberships)).toEqual([ADMIN_USER_ID]);
  });

  it("unions territory agents with linked-office agents", () => {
    const territoryId = TERRITORY_SPACE_COAST_ID;
    const ids = agentIdsForTerritory({
      territoryId,
      linkedOfficeIds: [OFFICE_PALM_BAY_ID],
      officeMemberships,
      territoryMemberships: [{ userId: ADMIN_USER_ID, territoryId }],
    });
    expect(ids.sort()).toEqual([ADMIN_USER_ID, AGENT_USER_ID].sort());
  });

  it("does not filter company-wide and drops rows outside an office", () => {
    const rows = [
      { id: "javy", ownerId: ADMIN_USER_ID },
      { id: "maya", ownerId: AGENT_USER_ID },
      { id: "orphan", ownerId: null },
    ];
    expect(filterByBookScope(rows, null)).toHaveLength(3);
    const savannah = resolveBookAgentIds({
      scope: { kind: "office", officeId: OFFICE_SAVANNAH_ID },
      officeMemberships,
      territoryMemberships: [],
      territoryOfficeLinks: [],
    });
    expect(filterByBookScope(rows, savannah).map((row) => row.id)).toEqual(["javy"]);
  });

  it("labels company / office / territory for the home hook", () => {
    expect(
      bookScopeLabel(
        { kind: "office", officeId: OFFICE_PALM_BAY_ID },
        {
          offices: [{ id: OFFICE_PALM_BAY_ID, name: "Palm Bay" }],
          territories: [],
        },
      ),
    ).toBe("Palm Bay office");
    expect(bookScopeLabel({ kind: "company" }, { offices: [], territories: [] })).toBe(
      "Company-wide",
    );
  });
});
