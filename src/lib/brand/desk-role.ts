import { cookies } from "next/headers";
import { DESK_ROLES, type DeskRole } from "@/lib/domain";

export const DESK_ROLE_COOKIE = "ff_desk_role";

export type DeskActor = {
  key: DeskRole;
  role: DeskRole;
  name: string;
  label: string;
};

const ACTORS: Record<DeskRole, DeskActor> = {
  admin: { key: "admin", role: "admin", name: "Javy Garcia", label: "Admin" },
  agent: { key: "agent", role: "agent", name: "Desk agent", label: "Agent" },
};

function asRole(value: string | undefined | null): DeskRole {
  if (value && (DESK_ROLES as readonly string[]).includes(value)) {
    return value as DeskRole;
  }
  return "admin";
}

/** Minimum Admin/Agent gate. Prefers roles-slice `getActor` when that table exists. */
export async function getDeskActor(): Promise<DeskActor> {
  try {
    const auth = (await new Function("spec", "return import(spec)")("@/lib/auth/session")) as {
      getActor?: () => Promise<{ role?: string; name?: string; id?: string }>;
    };
    if (typeof auth.getActor === "function") {
      const actor = await auth.getActor();
      const role = asRole(actor.role);
      return {
        key: role,
        role,
        name: actor.name ?? ACTORS[role].name,
        label: role === "admin" ? "Admin" : "Agent",
      };
    }
  } catch {
    // roles slice not merged
  }

  let cookieRole: string | undefined;
  try {
    const jar = await cookies();
    cookieRole = jar.get(DESK_ROLE_COOKIE)?.value;
  } catch {
    cookieRole = undefined;
  }
  return ACTORS[asRole(cookieRole)];
}

export function isAdminActor(actor: DeskActor): boolean {
  return actor.role === "admin";
}
