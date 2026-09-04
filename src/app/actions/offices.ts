"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  offices,
  territories,
  territoryOffices,
  userOffices,
  userTerritories,
} from "@/lib/db/schema";
import { parseCountyList, parseStateList } from "@/lib/org/states";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function all(form: FormData, key: string) {
  return form.getAll(key).map((value) => String(value).trim()).filter(Boolean);
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/settings/agency");
  revalidatePath("/settings/offices");
  revalidatePath("/settings/territories");
  revalidatePath("/");
}

async function replaceUserOffices(officeId: string, userIds: string[], primaryUserId: string | null) {
  await db
    .delete(userOffices)
    .where(and(eq(userOffices.tenantId, DEFAULT_TENANT_ID), eq(userOffices.officeId, officeId)));
  if (userIds.length === 0) return;
  const primary = primaryUserId && userIds.includes(primaryUserId) ? primaryUserId : null;
  await db.insert(userOffices).values(
    userIds.map((userId) => ({
      tenantId: DEFAULT_TENANT_ID,
      userId,
      officeId,
      isPrimary: primary != null && userId === primary,
    })),
  );
  if (primary) {
    const others = await db
      .select({ id: userOffices.id })
      .from(userOffices)
      .where(
        and(
          eq(userOffices.tenantId, DEFAULT_TENANT_ID),
          eq(userOffices.userId, primary),
          eq(userOffices.isPrimary, true),
        ),
      );
    for (const row of others) {
      await db
        .update(userOffices)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(userOffices.id, row.id));
    }
    await db
      .update(userOffices)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(userOffices.tenantId, DEFAULT_TENANT_ID),
          eq(userOffices.userId, primary),
          eq(userOffices.officeId, officeId),
        ),
      );
  }
}

async function replaceTerritoryOffices(territoryId: string, officeIds: string[]) {
  await db
    .delete(territoryOffices)
    .where(
      and(eq(territoryOffices.tenantId, DEFAULT_TENANT_ID), eq(territoryOffices.territoryId, territoryId)),
    );
  if (officeIds.length === 0) return;
  await db.insert(territoryOffices).values(
    officeIds.map((officeId) => ({
      tenantId: DEFAULT_TENANT_ID,
      territoryId,
      officeId,
    })),
  );
}

async function replaceTerritoryAgents(territoryId: string, userIds: string[]) {
  await db
    .delete(userTerritories)
    .where(
      and(eq(userTerritories.tenantId, DEFAULT_TENANT_ID), eq(userTerritories.territoryId, territoryId)),
    );
  if (userIds.length === 0) return;
  await db.insert(userTerritories).values(
    userIds.map((userId) => ({
      tenantId: DEFAULT_TENANT_ID,
      userId,
      territoryId,
    })),
  );
}

export async function saveOffice(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return;
  const states = parseStateList(all(formData, "states"));
  const address = str(formData, "address") || null;
  const timezone = str(formData, "timezone") || null;
  const agentIds = all(formData, "agentIds").filter(isUuid);
  const primaryUserId = str(formData, "primaryUserId");

  if (id && isUuid(id)) {
    await db
      .update(offices)
      .set({ name, states, address, timezone, updatedAt: new Date() })
      .where(and(eq(offices.tenantId, DEFAULT_TENANT_ID), eq(offices.id, id)));
    await replaceUserOffices(id, agentIds, isUuid(primaryUserId) ? primaryUserId : null);
  } else {
    const [row] = await db
      .insert(offices)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name,
        states,
        address,
        timezone,
      })
      .returning({ id: offices.id });
    if (row) await replaceUserOffices(row.id, agentIds, isUuid(primaryUserId) ? primaryUserId : null);
  }
  refresh();
}

export async function deleteOffice(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await db.delete(offices).where(and(eq(offices.tenantId, DEFAULT_TENANT_ID), eq(offices.id, id)));
  refresh();
}

export async function saveTerritory(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return;
  const states = parseStateList(all(formData, "states"));
  const counties = parseCountyList(str(formData, "counties"));
  const geoLabel = str(formData, "geoLabel") || null;
  const officeIds = all(formData, "officeIds").filter(isUuid);
  const agentIds = all(formData, "agentIds").filter(isUuid);

  if (id && isUuid(id)) {
    await db
      .update(territories)
      .set({ name, states, counties, geoLabel, updatedAt: new Date() })
      .where(and(eq(territories.tenantId, DEFAULT_TENANT_ID), eq(territories.id, id)));
    await replaceTerritoryOffices(id, officeIds);
    await replaceTerritoryAgents(id, agentIds);
  } else {
    const [row] = await db
      .insert(territories)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name,
        states,
        counties,
        geoLabel,
      })
      .returning({ id: territories.id });
    if (row) {
      await replaceTerritoryOffices(row.id, officeIds);
      await replaceTerritoryAgents(row.id, agentIds);
    }
  }
  refresh();
}

export async function deleteTerritory(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await db
    .delete(territories)
    .where(and(eq(territories.tenantId, DEFAULT_TENANT_ID), eq(territories.id, id)));
  refresh();
}
