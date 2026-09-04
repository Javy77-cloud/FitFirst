import { redirect } from "next/navigation";
import { adminRedirectPath, capabilitiesFor, type DeskCapabilities } from "@/lib/auth/access";
import { currentDeskSession, type DeskSession } from "@/lib/auth/session";

export class AdminOnlyError extends Error {
  constructor(message = "Admin only.") {
    super(message);
    this.name = "AdminOnlyError";
  }
}

export function sessionCapabilities(session: DeskSession): DeskCapabilities {
  if (!session.signedIn) return capabilitiesFor("guest");
  return capabilitiesFor(session.isAdmin ? "admin" : "agent");
}

export async function requireSignedIn(): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  return session;
}

export async function requireAdminPage(): Promise<DeskSession> {
  const session = await requireSignedIn();
  if (!session.isAdmin) redirect(adminRedirectPath());
  return session;
}

export async function requireAdminAction(message = "Admin only."): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.isAdmin) throw new AdminOnlyError(message);
  return session;
}

export async function requireSignedInAction(message = "Sign in to continue."): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error(message);
  return session;
}
