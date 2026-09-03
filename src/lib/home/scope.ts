import { cookies } from "next/headers";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

export type DeskRole = "owner" | "admin" | "agent";

export type OwnerHomeScope = {
  tenantId: string;
  role: DeskRole;
  /** Null = whole book (owner / admin). Set for Agent when assignee columns exist. */
  agentUserId: string | null;
  label: string;
};

const OWNER_ROLES = new Set<DeskRole>(["owner", "admin"]);

export function isAgencyWide(scope: OwnerHomeScope): boolean {
  return scope.agentUserId == null && OWNER_ROLES.has(scope.role);
}

/**
 * Role hook. Owner/admin see agency totals. Agent is scoped only when
 * `policies.owner_id` (or `assigned_to`) exists and a user id is present.
 * Default cookie is owner so Home boots as the agency desk.
 */
export async function currentOwnerHomeScope(): Promise<OwnerHomeScope> {
  const tenantId = DEFAULT_TENANT_ID;
  try {
    const jar = await cookies();
    const raw = jar.get("ff_actor")?.value ?? jar.get("ff_role")?.value ?? "owner";
    const role = normalizeRole(raw);
    const agentUserId = role === "agent" ? jar.get("ff_actor_id")?.value ?? null : null;
    return {
      tenantId,
      role,
      agentUserId,
      label: role === "agent" ? "Your book" : "Agency totals",
    };
  } catch {
    return {
      tenantId,
      role: "owner",
      agentUserId: null,
      label: "Agency totals",
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
