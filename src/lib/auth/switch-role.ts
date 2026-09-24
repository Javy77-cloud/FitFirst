import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sessionCookieOptions, SESSION_COOKIES } from "@/lib/auth/cookies";
import { sessionExpiryEpoch, sessionSecretFromEnv, signSessionToken } from "@/lib/auth/signed-session";
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
  const secret = sessionSecretFromEnv();
  const token = secret
    ? signSessionToken(
        {
          sub: user.id,
          role,
          mfa: "ok",
          mod: user.canAccessModules === false ? "0" : "1",
          name: user.name,
          imp: impersonatorId && impersonatorId !== user.id ? impersonatorId : "",
          exp: sessionExpiryEpoch(),
        },
        secret,
      )
    : null;
  if (!token) return false;
  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIES.session, token, opts);
  jar.set(SESSION_COOKIES.role, role, opts);
  jar.set(SESSION_COOKIES.actor, role, opts);
  jar.set(SESSION_COOKIES.actorId, user.id, opts);
  jar.set(SESSION_COOKIES.name, user.name, opts);
  jar.set(SESSION_COOKIES.modules, user.canAccessModules === false ? "0" : "1", opts);
  jar.set(SESSION_COOKIES.mfa, "ok", opts);
  jar.set(DESK_ROLE_COOKIE, role === "agent" ? "agent" : "admin", opts);
  jar.set(DESK_AGENT_COOKIE, user.id, opts);
  if (impersonatorId && impersonatorId !== user.id) {
    jar.set(SESSION_COOKIES.impersonatorId, impersonatorId, opts);
  } else {
    jar.delete(SESSION_COOKIES.impersonatorId);
  }
  return true;
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
  const sealed = await applyActorCookies(user, impersonatorId);
  if (!sealed) return { ok: false, error: "Session secret is not configured." };

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
