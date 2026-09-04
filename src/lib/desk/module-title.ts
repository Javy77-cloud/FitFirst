/** Header h1 follows the active left-nav module, not a leftover worksheet label. */

const MODULE_PREFIXES: readonly [string, string][] = [
  ["/get-started", "Get Started"],
  ["/pipeline", "Pipeline"],
  ["/leads", "Leads"],
  ["/deals", "Deals"],
  ["/contacts", "Contacts"],
  ["/accounts", "Businesses"],
  ["/businesses", "Businesses"],
  ["/policies", "Policies"],
  ["/forms", "Forms"],
  ["/quotes", "Quotes"],
  ["/merge", "Merge"],
  ["/work-queue", "Work queue"],
  ["/queue", "Work queue"],
  ["/claims", "Claims log"],
  ["/commissions", "Commissions"],
  ["/tasks", "Tasks"],
  ["/calendar", "Calendar"],
  ["/meetings", "Calendar"],
  ["/search", "Search"],
  ["/carriers", "Carriers"],
  ["/alerts", "Alerts"],
  ["/phone", "Phone"],
  ["/support", "Support"],
  ["/settings", "Settings"],
  ["/documents", "Documents"],
  ["/esign", "E-sign"],
  ["/reviews", "Reviews"],
  ["/campaigns", "Campaigns"],
  ["/fill-demo", "Fill demo"],
  ["/logs", "Logs"],
];

export function moduleTitleFromPath(pathname: string): string {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (path === "/") return "Home";
  for (const [prefix, label] of MODULE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return label;
  }
  return "Home";
}

export function recordSubtitle(moduleTitle: string, pageTitle?: string | null): string | null {
  const next = (pageTitle ?? "").trim();
  if (!next || next === moduleTitle) return null;
  return next;
}
