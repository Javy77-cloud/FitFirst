import { userIsSiteDeveloper } from "@/lib/developer/site-developer";

export const DEVELOPER_PATHS = ["/developer", "/settings/developer-hub/api-vault"] as const;

export function isDeveloperRole(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase() === "developer";
}

export function sessionIsDeveloper(input: {
  role?: string | null;
  isSiteDeveloper?: boolean | null;
  email?: string | null;
}): boolean {
  if (isDeveloperRole(input.role)) return true;
  if (input.isSiteDeveloper) return true;
  return userIsSiteDeveloper({ email: input.email, isSiteDeveloper: input.isSiteDeveloper });
}

export function isDeveloperOnlyPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return DEVELOPER_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function developerRedirectPath(): string {
  return "/me?error=developer-only";
}
