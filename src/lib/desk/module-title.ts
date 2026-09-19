/** Header h1 follows the active left-nav module, not a leftover worksheet label. */

const MODULE_PREFIXES: readonly [string, string][] = [
  ["/get-started", "Get Started"],
  ["/social", "Social"],
  ["/pipeline", "Deals"],
  ["/leads", "Leads"],
  ["/deals", "Deals"],
  ["/contacts", "Contacts"],
  ["/accounts", "Accounts"],
  ["/businesses", "Accounts"],
  ["/policies", "Policies"],
  ["/renewals", "Renewals"],
  ["/certificates", "Certificates"],
  ["/inspections", "Inspections"],
  ["/endorsements", "Endorsements"],
  ["/forms", "Documents"],
  ["/quotes", "Quotes"],
  ["/merge", "Merge"],
  ["/work-queue", "Work queue"],
  ["/queue", "Work queue"],
  ["/claims", "Claims log"],
  ["/commissions", "Commissions"],
  ["/scorecards", "Scorecards"],
  ["/glance", "Glance"],
  ["/tasks", "Notifications"],
  ["/automations", "Automations"],
  ["/calendar", "Calendar"],
  ["/meetings", "Calendar"],
  ["/search", "Search"],
  ["/carriers", "Carriers"],
  ["/notifications", "Notifications"],
  ["/alerts", "Notifications"],
  ["/inbox", "Inbox"],
  ["/phone", "Phone"],
  ["/support", "Support"],
  ["/settings", "Settings"],
  ["/documents/signed", "Signed documents"],
  ["/documents", "Documents"],
  ["/esign", "Signed documents"],
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
