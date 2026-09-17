export type AgentPrivilegeFlags = {
  canAccessModules: boolean;
  canSeeAgencyWidgets: boolean;
};

export function defaultPrivilegesForRole(role: string): AgentPrivilegeFlags {
  const admin = role === "admin" || role === "owner";
  const developer = role === "developer";
  return {
    canAccessModules: true,
    canSeeAgencyWidgets: admin || developer,
  };
}

export function parsePrivilegeForm(form: FormData): AgentPrivilegeFlags {
  return {
    canAccessModules: form.get("canAccessModules") === "on" || form.get("canAccessModules") === "true",
    canSeeAgencyWidgets: form.get("canSeeAgencyWidgets") === "on" || form.get("canSeeAgencyWidgets") === "true",
  };
}

/** CRM / pipeline / book modules. Home, alerts, and My desk stay available. */
export const MODULE_PATH_PREFIXES = [
  "/pipeline",
  "/leads",
  "/deals",
  "/contacts",
  "/accounts",
  "/businesses",
  "/policies",
  "/forms",
  "/quotes",
  "/merge",
  "/work-queue",
  "/claims",
  "/commissions",
  "/tasks",
  "/calendar",
  "/search",
  "/carriers",
  "/phone",
  "/inbox",
  "/campaigns",
  "/reviews",
  "/esign",
  "/documents",
  "/logs",
  "/queue",
] as const;

export function isModulePath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return MODULE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
