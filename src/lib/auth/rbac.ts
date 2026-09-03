import type { UserRole } from "@/lib/domain";

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export function isAdmin(actor: Actor | null | undefined): boolean {
  return actor?.role === "admin";
}

export function isAgent(actor: Actor | null | undefined): boolean {
  return actor?.role === "agent";
}

export function canSeeOwned(
  actor: Actor,
  ownerId: string | null | undefined,
): boolean {
  if (isAdmin(actor)) return true;
  return ownerId === actor.id;
}

export function canAssignOwner(actor: Actor): boolean {
  return isAdmin(actor);
}

export function canResolveAsk(actor: Actor): boolean {
  return isAdmin(actor);
}

export function canPostAsk(actor: Actor): boolean {
  return actor.role === "admin" || actor.role === "agent";
}

export function visibleOwnerId(actor: Actor): string | null {
  return isAdmin(actor) ? null : actor.id;
}

export function commissionViewFor(actor: Actor, requested?: string | null): "mine" | "agency" {
  if (!isAdmin(actor)) return "mine";
  return requested === "mine" ? "mine" : "agency";
}
