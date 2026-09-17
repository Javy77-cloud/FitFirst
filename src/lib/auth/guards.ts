import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminRedirectPath,
  capabilitiesFor,
  developerRedirectPath,
  type DeskCapabilities,
} from "@/lib/auth/access";
import { isMfaSetupPath } from "@/lib/auth/mfa";
import { currentDeskSession, type DeskSession } from "@/lib/auth/session";

function pathFromHeaders(headerList: Headers): string {
  const nextUrl = headerList.get("next-url");
  if (nextUrl) {
    try {
      return new URL(nextUrl, "http://local.invalid").pathname;
    } catch {
      return nextUrl;
    }
  }
  return headerList.get("x-ff-pathname") ?? "";
}

function enforceMfaGate(session: DeskSession, pathname: string) {
  if (session.mfaStatus === "challenge") redirect("/login/mfa");
  if (session.mfaStatus === "pending" && !isMfaSetupPath(pathname)) {
    redirect("/enroll-mfa");
  }
}

export class AdminOnlyError extends Error {
  constructor(message = "Admin only.") {
    super(message);
    this.name = "AdminOnlyError";
  }
}

export function sessionCapabilities(session: DeskSession): DeskCapabilities {
  if (!session.signedIn) return capabilitiesFor("guest");
  const role = session.role === "developer" ? "developer" : session.isAdmin ? "admin" : "agent";
  return capabilitiesFor(role, { isDeveloper: session.isDeveloper });
}

export async function requireSignedIn(): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  const pathname = pathFromHeaders(await headers());
  enforceMfaGate(session, pathname);
  return session;
}

/** Signed in, including MFA-pending enroll / profile / security. */
export async function requireSignedInAllowMfaSetup(): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  if (session.mfaStatus === "challenge") redirect("/login/mfa");
  return session;
}

export async function requireMfaChallengeSession(): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  if (session.mfaStatus !== "challenge") redirect(session.mfaStatus === "pending" ? "/enroll-mfa" : "/");
  return session;
}

export async function requireAdminPage(): Promise<DeskSession> {
  const session = await requireSignedIn();
  if (!session.isAdmin) redirect(adminRedirectPath());
  return session;
}

/** Platform builders only (users.is_site_developer or FF_SITE_DEVELOPER_EMAILS). Not agents/admins. */
export async function requireSiteDeveloperPage(): Promise<DeskSession> {
  const session = await requireSignedIn();
  if (!session.isSiteDeveloper) redirect("/settings/developer");
  return session;
}

/** Third profile: Developer role or site-developer flag. Separate from Admin settings. */
export async function requireDeveloperPage(): Promise<DeskSession> {
  const session = await requireSignedIn();
  if (!session.isDeveloper) redirect(developerRedirectPath());
  return session;
}

export async function requireAdminOrDeveloperPage(): Promise<DeskSession> {
  const session = await requireSignedIn();
  if (!session.isAdmin && !session.isDeveloper) redirect(adminRedirectPath());
  return session;
}

export async function requireAdminAction(message = "Admin only."): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.isAdmin) throw new AdminOnlyError(message);
  return session;
}

export async function requireAdminOrDeveloperAction(
  message = "Admin or Developer only.",
): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn || (!session.isAdmin && !session.isDeveloper)) {
    throw new AdminOnlyError(message);
  }
  return session;
}

export async function requireSignedInAction(message = "Sign in to continue."): Promise<DeskSession> {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error(message);
  return session;
}
