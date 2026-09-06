import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/cookies";
import { currentDeskSession, findUser } from "@/lib/auth/session";
import { DESK_ROLE_COOKIE } from "@/lib/brand/desk-role";
import { DESK_AGENT_COOKIE } from "@/lib/crm/desk-agent";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";
import { normalizeRole } from "@/lib/home/scope";
import type { User } from "@/lib/db/schema";

async function realAdminId(): Promise<{ id: string; name: string } | null> {
  const session = await currentDeskSession();
  if (session.isAdmin && session.userId && session.name) {
    return { id: session.userId, name: session.name };
  }
  if (session.impersonatorId && session.impersonatorName) {
    return { id: session.impersonatorId, name: session.impersonatorName };
  }
  return null;
}

async function applyActorCookies(user: User, impersonatorId: string | null) {
  const role = normalizeRole(user.role);
  const jar = await cookies();
  jar.set(SESSION_COOKIES.role, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actor, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actorId, user.id, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.name, user.name, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.modules, user.canAccessModules === false ? "0" : "1", SESSION_COOKIE_OPTS);
  jar.set(DESK_ROLE_COOKIE, role === "agent" ? "agent" : "admin", SESSION_COOKIE_OPTS);
  jar.set(DESK_AGENT_COOKIE, user.id, SESSION_COOKIE_OPTS);
  if (impersonatorId && impersonatorId !== user.id) {
    jar.set(SESSION_COOKIES.impersonatorId, impersonatorId, SESSION_COOKIE_OPTS);
  } else {
    jar.delete(SESSION_COOKIES.impersonatorId);
  }
}

export async function switchDeskRole(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await realAdminId();
  if (!admin) return { ok: false, error: "Admin only." };
  const user = targetUserId ? await findUser(targetUserId) : null;
  if (!user?.active) return { ok: false, error: "That login is not active." };

  const session = await currentDeskSession();
  const fromId = session.userId;
  const fromName = session.name;
  const impersonatorId = user.id === admin.id ? null : admin.id;
  await applyActorCookies(user, impersonatorId);

  await writeEoAuditSafe({
    action: "role_switch",
    summary: `${admin.name} switched view from ${fromName || "desk"} to ${user.name} (${normalizeRole(user.role)})`,
    actorId: admin.id,
    actorName: admin.name,
    entityType: "user",
    entityId: user.id,
    meta: {
      impersonatorId: admin.id,
      fromUserId: fromId,
      toUserId: user.id,
      toRole: normalizeRole(user.role),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
