import { cookies } from "next/headers";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { parseBookScope, type BookScope } from "./presets";
import type { BookScopeKind } from "@/lib/org/book-scope";

export type DeskRole = "owner" | "admin" | "agent";

export type OwnerHomeScope = {
  tenantId: string;
  role: DeskRole;
  /** Null = whole book (owner / admin). Set for Agent when assignee columns exist. */
  agentUserId: string | null;
  label: string;
  bookScope: BookScope;
  canToggleBook: boolean;
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
export async function currentOwnerHomeScope(bookScope?: BookScope): Promise<OwnerHomeScope> {
  const tenantId = DEFAULT_TENANT_ID;
  const scope = bookScope ?? "agency";
  try {
    const { currentDeskSession } = await import("@/lib/auth/session");
    const session = await currentDeskSession();
    if (session.signedIn) {
      const mine = !session.isAdmin || parseBookScope(scope) === "my_book";
      return {
        tenantId,
        role: session.role,
        agentUserId: mine ? session.userId : null,
        label: mine ? "My book" : "Agency-wide",
        bookScope: session.isAdmin ? parseBookScope(scope) : "my_book",
        canToggleBook: session.isAdmin,
      };
    }
    const jar = await cookies();
    const raw = jar.get("ff_actor")?.value ?? jar.get("ff_role")?.value ?? "";
    const role = normalizeRole(raw || "agent");
    const mine = role === "agent" || parseBookScope(scope) === "my_book";
    return {
      tenantId,
      role,
      agentUserId: mine ? jar.get("ff_actor_id")?.value ?? null : null,
      label: mine ? "My book" : "Agency-wide",
      bookScope: role === "agent" ? "my_book" : parseBookScope(scope),
      canToggleBook: role !== "agent",
    };
  } catch {
    return {
      tenantId,
      role: "agent",
      agentUserId: null,
      label: "Sign in",
      bookScope: "my_book",
      canToggleBook: false,
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
