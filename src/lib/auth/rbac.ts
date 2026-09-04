import { isAdmin, type DeskActor } from "@/lib/auth/session";

export type Actor = DeskActor;

export { isAdmin };

export function canPostAsk(_actor: Actor): boolean {
  return true;
}

export function canResolveAsk(actor: Actor): boolean {
  return isAdmin(actor);
}
