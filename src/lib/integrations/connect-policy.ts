import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { DeskSession } from "@/lib/auth/session";

/** Agency Admin owns vendor apps. A solo Admin who also works the desk can connect personal Gmail. */
export function canConnectByoIntegration(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
): boolean {
  return Boolean(session.signedIn && session.isAdmin);
}

export function canConnectPersonalGmail(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
  soloDesk: boolean,
): boolean {
  return canConnectByoIntegration(session) && (session.isAdmin || soloDesk);
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

export function gmailConnectCopy(soloDesk: boolean): string {
  if (soloDesk) {
    return "Solo Admin + desk — this Gmail is your personal inbox. Agency Admin still owns the Google Cloud app.";
  }
  return "Agency Admin connects the agency Gmail / Workspace inbox. Agents cannot start OAuth.";
}
