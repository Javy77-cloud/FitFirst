import { and, eq } from "drizzle-orm";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  OFFICE_PALM_BAY_ID,
  OFFICE_SAVANNAH_ID,
  TENANT_ID,
  TERRITORY_OFFICE_SPACE_COAST_PALM_BAY_ID,
  TERRITORY_SPACE_COAST_ID,
  USER_OFFICE_JAVY_PALM_BAY_ID,
  USER_OFFICE_JAVY_SAVANNAH_ID,
  USER_OFFICE_MAYA_PALM_BAY_ID,
  USER_TERRITORY_JAVY_SPACE_COAST_ID,
} from "../fixtures/ids";
import { db } from "./index";
import { offices, territories, territoryOffices, userOffices, userTerritories } from "./schema";

/**
 * Palm Bay is the home desk. Savannah is the second (GA) office so Javy can sit
 * in two states. Maya stays Palm Bay only. Space Coast territory links Palm Bay.
 */
export async function seedOfficesAndTerritories() {
  await db
    .insert(offices)
    .values({
      id: OFFICE_PALM_BAY_ID,
      tenantId: TENANT_ID,
      name: "Palm Bay",
      states: ["FL"],
      address: "2100 Palm Bay Rd NE, Palm Bay, FL 32905",
      timezone: "America/New_York",
    })
    .onConflictDoUpdate({
      target: offices.id,
      set: {
        name: "Palm Bay",
        states: ["FL"],
        address: "2100 Palm Bay Rd NE, Palm Bay, FL 32905",
        timezone: "America/New_York",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(offices)
    .values({
      id: OFFICE_SAVANNAH_ID,
      tenantId: TENANT_ID,
      name: "Savannah",
      states: ["GA"],
      address: "17 W McDonough St, Savannah, GA 31401",
      timezone: null,
    })
    .onConflictDoUpdate({
      target: offices.id,
      set: {
        name: "Savannah",
        states: ["GA"],
        address: "17 W McDonough St, Savannah, GA 31401",
        timezone: null,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(territories)
    .values({
      id: TERRITORY_SPACE_COAST_ID,
      tenantId: TENANT_ID,
      name: "Space Coast",
      states: ["FL"],
      counties: ["Brevard"],
      geoLabel: "Palm Bay / Melbourne / Brevard",
    })
    .onConflictDoUpdate({
      target: territories.id,
      set: {
        name: "Space Coast",
        states: ["FL"],
        counties: ["Brevard"],
        geoLabel: "Palm Bay / Melbourne / Brevard",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(territoryOffices)
    .values({
      id: TERRITORY_OFFICE_SPACE_COAST_PALM_BAY_ID,
      tenantId: TENANT_ID,
      territoryId: TERRITORY_SPACE_COAST_ID,
      officeId: OFFICE_PALM_BAY_ID,
    })
    .onConflictDoUpdate({
      target: territoryOffices.id,
      set: {
        territoryId: TERRITORY_SPACE_COAST_ID,
        officeId: OFFICE_PALM_BAY_ID,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(userOffices)
    .values([
      {
        id: USER_OFFICE_JAVY_PALM_BAY_ID,
        tenantId: TENANT_ID,
        userId: ADMIN_USER_ID,
        officeId: OFFICE_PALM_BAY_ID,
        isPrimary: true,
      },
      {
        id: USER_OFFICE_JAVY_SAVANNAH_ID,
        tenantId: TENANT_ID,
        userId: ADMIN_USER_ID,
        officeId: OFFICE_SAVANNAH_ID,
        isPrimary: false,
      },
      {
        id: USER_OFFICE_MAYA_PALM_BAY_ID,
        tenantId: TENANT_ID,
        userId: AGENT_USER_ID,
        officeId: OFFICE_PALM_BAY_ID,
        isPrimary: true,
      },
    ])
    .onConflictDoUpdate({
      target: userOffices.id,
      set: { updatedAt: new Date() },
    });

  await db
    .update(userOffices)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(userOffices.id, USER_OFFICE_JAVY_PALM_BAY_ID));
  await db
    .update(userOffices)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(eq(userOffices.id, USER_OFFICE_JAVY_SAVANNAH_ID));
  await db
    .update(userOffices)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(userOffices.id, USER_OFFICE_MAYA_PALM_BAY_ID));

  await db
    .delete(userOffices)
    .where(
      and(
        eq(userOffices.tenantId, TENANT_ID),
        eq(userOffices.userId, AGENT_USER_ID),
        eq(userOffices.officeId, OFFICE_SAVANNAH_ID),
      ),
    );

  await db
    .insert(userTerritories)
    .values({
      id: USER_TERRITORY_JAVY_SPACE_COAST_ID,
      tenantId: TENANT_ID,
      userId: ADMIN_USER_ID,
      territoryId: TERRITORY_SPACE_COAST_ID,
    })
    .onConflictDoUpdate({
      target: userTerritories.id,
      set: {
        userId: ADMIN_USER_ID,
        territoryId: TERRITORY_SPACE_COAST_ID,
        updatedAt: new Date(),
      },
    });
}
