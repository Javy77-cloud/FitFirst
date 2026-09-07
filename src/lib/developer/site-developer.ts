/**
 * Site developer is a super-dev flag, not Admin.
 * Admins can see that a FedEx key exists (masked). Only site developers can enter, rotate, or clear it.
 *
 * Grant:
 *   - users.is_site_developer = true (SQL / migrate; never from the Admin people UI)
 *   - or FF_SITE_DEVELOPER_EMAILS=javy@fitfirst.local (comma-separated, local Mac test)
 */
type EnvSlice = { FF_SITE_DEVELOPER_EMAILS?: string };

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
