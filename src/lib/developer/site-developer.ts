/**
 * Site developer is a super-dev flag, not Admin.
 * Admins can see that a FedEx key exists (masked). Only site developers can enter, rotate, or clear it.
 *
 * Grant:
 *   - users.is_site_developer = true (SQL / migrate; never from the Admin people UI)
 *   - or FF_SITE_DEVELOPER_EMAILS=javy@fitfirst.local (comma-separated, local Mac test)
 *
 * Vault mutate gates on this flag (or env emails), not role=admin. A Developer-role
 * user with is_site_developer=true must be able to save. A plain Admin cannot.
 */
type EnvSlice = { FF_SITE_DEVELOPER_EMAILS?: string };

export type SiteDeveloperSessionSlice = {
  signedIn?: boolean;
  isSiteDeveloper?: boolean | null;
  user?: { email?: string | null; isSiteDeveloper?: boolean | null } | null;
};

export class SignInRequiredError extends Error {
  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "SignInRequiredError";
  }
}

export class SiteDeveloperOnlyError extends Error {
  constructor(message = "Site developer only.") {
    super(message);
    this.name = "SiteDeveloperOnlyError";
  }
}

export function siteDeveloperEmailsFromEnv(env: EnvSlice = process.env): string[] {
  return (env.FF_SITE_DEVELOPER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function userIsSiteDeveloper(
  user: { email?: string | null; isSiteDeveloper?: boolean | null } | null | undefined,
  env: EnvSlice = process.env,
): boolean {
  if (!user) return false;
  if (user.isSiteDeveloper) return true;
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;
  return siteDeveloperEmailsFromEnv(env).includes(email);
}

/** Same rule as API vault `canEdit={session.isSiteDeveloper}` — Admin role is not enough. */
export function sessionCanMutateSiteDeveloperVault(
  session: SiteDeveloperSessionSlice,
  env: EnvSlice = process.env,
): boolean {
  if (!session.signedIn) return false;
  return Boolean(session.isSiteDeveloper) || userIsSiteDeveloper(session.user, env);
}

export function assertSiteDeveloperSession(
  session: SiteDeveloperSessionSlice,
  env: EnvSlice = process.env,
): void {
  if (!session.signedIn) throw new SignInRequiredError();
  if (!sessionCanMutateSiteDeveloperVault(session, env)) {
    throw new SiteDeveloperOnlyError();
  }
}
