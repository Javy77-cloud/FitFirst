/** Admin vs Agent capability matrix. UI hide must match these gates. */

export const ADMIN_ONLY_PATHS = [
  "/settings/agency",
  "/settings/offices",
  "/settings/territories",
  "/settings/lines",
  "/settings/phone",
  "/settings/sms",
  "/settings/email-templates",
  "/settings/email-signatures",
  "/settings/email-triggers",
  "/settings/agents",
  "/settings/export",
  "/settings/developer",
  "/settings/developer-hub",
  "/settings/import-export",
  "/settings/import",
  "/settings/billing",
  "/settings/integrations",
  "/settings/carrier-download",
  "/logs/fill-learning",
  "/compliance",
  "/admin",
] as const;

const PERSONAL_SETTINGS_PATHS = [
  "/settings/profile",
  "/settings/security",
  "/settings/my-desk",
  "/me",
] as const;

export type AccessRole = "admin" | "agent" | "guest";

export type DeskCapabilities = {
  role: AccessRole;
  signedIn: boolean;
  seeAllBooks: boolean;
  seeAdminSettings: boolean;
  askTeammate: boolean;
  connectAgencyIntegrations: boolean;
  editGlobalLists: boolean;
  editAppetiteTools: boolean;
  ownBookCrm: boolean;
  sendClientComms: boolean;
  calendarOwnItems: boolean;
  pipelineOwnDeals: boolean;
};

const GUEST: DeskCapabilities = {
  role: "guest",
  signedIn: false,
  seeAllBooks: false,
  seeAdminSettings: false,
  askTeammate: false,
  connectAgencyIntegrations: false,
  editGlobalLists: false,
  editAppetiteTools: false,
  ownBookCrm: false,
  sendClientComms: false,
  calendarOwnItems: false,
  pipelineOwnDeals: false,
};

const ADMIN: DeskCapabilities = {
  role: "admin",
  signedIn: true,
  seeAllBooks: true,
  seeAdminSettings: true,
  askTeammate: true,
  connectAgencyIntegrations: true,
  editGlobalLists: true,
  editAppetiteTools: true,
  ownBookCrm: true,
  sendClientComms: true,
  calendarOwnItems: true,
  pipelineOwnDeals: true,
};

const AGENT: DeskCapabilities = {
  role: "agent",
  signedIn: true,
  seeAllBooks: false,
  seeAdminSettings: false,
  askTeammate: false,
  connectAgencyIntegrations: false,
  editGlobalLists: false,
  editAppetiteTools: false,
  ownBookCrm: true,
  sendClientComms: true,
  calendarOwnItems: true,
  pipelineOwnDeals: true,
};

export function capabilitiesFor(role: AccessRole | string | null | undefined): DeskCapabilities {
  if (role === "admin" || role === "owner") return ADMIN;
  if (role === "agent") return AGENT;
  return GUEST;
}

export function isAdminOnlyPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (PERSONAL_SETTINGS_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false;
  }
  if (path === "/settings") return true;
  return ADMIN_ONLY_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/invite" || path.startsWith("/invite/")) return true;
  if (path === "/recover" || path.startsWith("/recover/")) return true;
  if (path === "/fill-demo" || path.startsWith("/fill-demo/")) return true;
  if (path === "/portal" || path.startsWith("/portal/")) return true;
  if (path === "/sign" || path.startsWith("/sign/")) return true;
  if (path.startsWith("/api/portal")) return true;
  if (path.startsWith("/api/sign")) return true;
  if (path.startsWith("/api/session")) return true;
  if (path === "/api/v1" || path.startsWith("/api/v1/")) return true;
  if (path.startsWith("/api/dev/")) return true;
  return false;
}

export function adminRedirectPath(): string {
  return "/me?error=admin-only";
}
