import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { DEFAULT_TENANT_ID, type UserRole } from "@/lib/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Actor } from "./rbac";

export const ACTOR_COOKIE = "ff_actor";

const FALLBACK_ADMIN: Actor = {
  id: ADMIN_USER_ID,
  name: "Javy Rivera",
  email: "javy@fitfirst.local",
  role: "admin",
};

function toActor(row: { id: string; name: string; email: string; role: string }): Actor {
  const role: UserRole = row.role === "admin" ? "admin" : "agent";
  return { id: row.id, name: row.name, email: row.email, role };
}

export async function listActors(): Promise<Actor[]> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, DEFAULT_TENANT_ID))
      .orderBy(users.name);
    return rows.filter((u) => u.active).map(toActor);
  } catch {
    return [FALLBACK_ADMIN];
  }
}

export async function findUser(id: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  return row ?? null;
}

export async function getActor(): Promise<Actor> {
  let cookieId: string | undefined;
  try {
    const jar = await cookies();
    cookieId = jar.get(ACTOR_COOKIE)?.value;
  } catch {
    cookieId = undefined;
  }

  if (cookieId) {
    try {
      const row = await findUser(cookieId);
      if (row?.active) return toActor(row);
    } catch {
      // fall through to default admin
    }
  }

  try {
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.id, ADMIN_USER_ID));
    if (admin) return toActor(admin);
  } catch {
    // seed has not run yet
  }

  return FALLBACK_ADMIN;
}
