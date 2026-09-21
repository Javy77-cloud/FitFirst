import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { DeskSession } from "@/lib/auth/session";

const GOOGLE_PERSONAL_PROVIDERS = new Set(["gmail", "google_calendar", "google_meet"]);

/** Agency Admin owns vendor apps. A solo Admin who also works the desk can connect personal Gmail. */
export function canConnectByoIntegration(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
): boolean {
  return Boolean(session.signedIn && session.isAdmin);
}

export function isGooglePersonalProvider(provider: string): boolean {
  return GOOGLE_PERSONAL_PROVIDERS.has(provider);
}

export function canConnectPersonalGmail(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
  soloDesk: boolean,
  agentsMayConnectPersonalGoogle = false,
): boolean {
  if (canConnectByoIntegration(session) && (session.isAdmin || soloDesk)) return true;
  return Boolean(session.signedIn && agentsMayConnectPersonalGoogle);
}

export function canStartByoOauth(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
  provider: string,
  agentsMayConnectPersonalGoogle = false,
): boolean {
  if (canConnectByoIntegration(session)) return true;
  if (!session.signedIn) return false;
  return isGooglePersonalProvider(provider) && agentsMayConnectPersonalGoogle;
}

export async function tenantLooksSolo(tenantId = DEFAULT_TENANT_ID): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.active, true)));
    const deskUsers = rows.filter((row) => row.role !== "developer");
    const admins = deskUsers.filter((row) => row.role === "admin" || row.role === "owner");
    return deskUsers.length <= 1 || (admins.length === 1 && deskUsers.length <= 2);
  } catch {
    return false;
  }
}

export function gmailConnectCopy(soloDesk: boolean, agentsMayConnectPersonalGoogle = false): string {
  if (soloDesk) {
    return "Solo Admin + desk — this Gmail is your personal inbox. Click Connect to approve Google. Replace or clear app keys anytime.";
  }
  if (agentsMayConnectPersonalGoogle) {
    return "Agency Admin connects the agency Gmail / Workspace inbox. Agents may connect personal Google with the agency app — they cannot paste Client ID + Secret.";
  }
  return "Agency Admin connects the agency Gmail / Workspace inbox with one-click Google Connect. Paste or replace Client ID + Secret here. Agents cannot start OAuth unless People & access allows personal Google.";
}
