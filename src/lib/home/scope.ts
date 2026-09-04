import { cookies } from "next/headers";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import type { BookScopeKind } from "@/lib/org/book-scope";

export type DeskRole = "owner" | "admin" | "agent";

export type OwnerHomeScope = {
  tenantId: string;
  role: DeskRole;
  /** Null = whole book (owner / admin). Set for Agent when assignee columns exist. */
  agentUserId: string | null;
  label: string;
  /** Admin office / territory lens. Null agent list = company-wide. */
  bookKind?: BookScopeKind;
  bookAgentIds?: string[] | null;
};

const OWNER_ROLES = new Set<DeskRole>(["owner", "admin"]);

export function isAgencyWide(scope: OwnerHomeScope): boolean {
  const company = (scope.bookKind ?? "company") === "company";
  return scope.agentUserId == null && OWNER_ROLES.has(scope.role) && company;
}

/**
 * Role hook. Owner/admin see agency totals. Agent is scoped only when
 * `policies.owner_id` (or `assigned_to`) exists and a user id is present.
 * Default cookie is owner so Home boots as the agency desk.
 */
export async function currentOwnerHomeScope(): Promise<OwnerHomeScope> {
  const tenantId = DEFAULT_TENANT_ID;
  try {
    const { currentDeskSession } = await import("@/lib/auth/session");
    const session = await currentDeskSession();
    if (session.signedIn) {
      return {
        tenantId,
        role: session.role,
        agentUserId: session.isAdmin ? null : session.userId,
        label: session.isAdmin ? "Agency totals" : "Your book",
      };
    }
    const jar = await cookies();
    const raw = jar.get("ff_actor")?.value ?? jar.get("ff_role")?.value ?? "";
    const role = normalizeRole(raw || "agent");
    return {
      tenantId,
      role,
      agentUserId: role === "agent" ? jar.get("ff_actor_id")?.value ?? null : null,
      label: role === "agent" ? "Your book" : "Agency totals",
    };
  } catch {
    return {
      tenantId,
      role: "agent",
      agentUserId: null,
      label: "Sign in",
    };
  }
}

export function normalizeRole(raw: string): DeskRole {
  const value = raw.trim().toLowerCase();
  if (value === "agent" || value === "producer") return "agent";
  if (value === "admin") return "admin";
  return "owner";
}

export function scopePoliciesSql(
  hasAssignee: boolean,
  scope: OwnerHomeScope,
): { clause: string; params: string[] } {
  if (scope.agentUserId && hasAssignee) {
    return { clause: "and coalesce(p.owner_id, p.assigned_to) = $agent", params: [scope.agentUserId] };
  }
  return { clause: "", params: [] };
}
