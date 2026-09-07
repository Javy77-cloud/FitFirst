/** Header h1 follows the active left-nav module, not a leftover worksheet label. */

const MODULE_PREFIXES: readonly [string, string][] = [
  ["/get-started", "Get Started"],
  ["/social", "Social"],
  ["/pipeline", "Deals"],
  ["/leads", "Leads"],
  ["/deals", "Deals"],
  ["/contacts", "Contacts"],
  ["/accounts", "Businesses"],
  ["/businesses", "Businesses"],
  ["/policies", "Policies"],
  ["/forms", "Documents"],
  ["/quotes", "Quotes"],
  ["/merge", "Merge"],
  ["/work-queue", "Work queue"],
  ["/queue", "Work queue"],
  ["/claims", "Claims log"],
  ["/commissions", "Commissions"],
  ["/scorecards", "Scorecards"],
  ["/glance", "Glance"],
  ["/tasks", "Tasks"],
  ["/automations", "Automations"],
  ["/calendar", "Calendar"],
  ["/meetings", "Calendar"],
  ["/search", "Search"],
  ["/carriers", "Carriers"],
  ["/notifications", "Notification board"],
  ["/alerts", "Alerts"],
  ["/inbox", "Inbox"],
  ["/phone", "Phone"],
  ["/support", "Support"],
  ["/settings", "Settings"],
  ["/documents", "Documents"],
  ["/esign", "E-sign"],
  ["/reviews", "Reviews"],
  ["/campaigns", "Campaigns"],
  ["/fill-demo", "Fill demo"],
  ["/logs", "Logs"],
  ["/compliance", "Compliance"],
];

export function moduleTitleFromPath(pathname: string): string {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (path === "/") return "Dashboard";
  for (const [prefix, label] of MODULE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return label;
  }
  return "Dashboard";
}

export function recordSubtitle(moduleTitle: string, pageTitle?: string | null): string | null {
  const next = (pageTitle ?? "").trim();
  if (!next || next === moduleTitle) return null;
  return next;
}
