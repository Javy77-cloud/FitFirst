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
  return ADMIN_ONLY_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/invite" || path.startsWith("/invite/")) return true;
  if (path === "/fill-demo" || path.startsWith("/fill-demo/")) return true;
  if (path.startsWith("/api/session")) return true;
  return false;
}

export function adminRedirectPath(): string {
  return "/settings/my-desk?error=admin-only";
}
