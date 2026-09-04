import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import { offices, territories, territoryOffices, userOffices, userTerritories, users } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listOfficeStubs() {
  return db
    .select({ id: offices.id, name: offices.name })
    .from(offices)
    .where(eq(offices.tenantId, tenant()))
    .orderBy(offices.name);
}

export async function listTerritoryStubs() {
  return db
    .select({ id: territories.id, name: territories.name })
    .from(territories)
    .where(eq(territories.tenantId, tenant()))
    .orderBy(territories.name);
}

export async function loadInviteCatalog() {
  const [officeRows, territoryRows, officeMemberships, territoryMemberships, territoryOfficeLinks, userRows] =
    await Promise.all([
      listOfficeStubs(),
      listTerritoryStubs(),
      db
        .select({ userId: userOffices.userId, officeId: userOffices.officeId })
        .from(userOffices)
        .where(eq(userOffices.tenantId, tenant())),
      db
        .select({ userId: userTerritories.userId, territoryId: userTerritories.territoryId })
        .from(userTerritories)
        .where(eq(userTerritories.tenantId, tenant())),
      db
        .select({ territoryId: territoryOffices.territoryId, officeId: territoryOffices.officeId })
        .from(territoryOffices)
        .where(eq(territoryOffices.tenantId, tenant())),
      db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          active: users.active,
        })
        .from(users)
        .where(eq(users.tenantId, tenant())),
    ]);
  return {
    offices: officeRows,
    territories: territoryRows,
    officeMemberships,
    territoryMemberships,
    territoryOfficeLinks,
    users: userRows,
  };
}
