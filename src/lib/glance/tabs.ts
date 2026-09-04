export const GLANCE_TABS = ["sales", "service", "claims", "renewals"] as const;
export type GlanceTab = (typeof GLANCE_TABS)[number];

export const GLANCE_TAB_LABEL: Record<GlanceTab, string> = {
  sales: "Sales",
  service: "Service",
  claims: "Claims",
  renewals: "Renewals",
};

export const GLANCE_TAB_HINT: Record<GlanceTab, string> = {
  sales: "Open shops still on the book. Quote Sent stays shopping — Ana is unbound.",
  service: "Open review tasks, endorsements, and policy work already on the desk.",
  claims: "Desk claim notices already logged. This is not FNOL.",
  renewals: "In-force terms expiring in the next 60 days. Quotes are not renewals.",
};

export function parseGlanceTab(value: string | null | undefined): GlanceTab {
  return (GLANCE_TABS as readonly string[]).includes(value ?? "")
    ? (value as GlanceTab)
    : "sales";
}

export function glanceHref(tab: GlanceTab): string {
  return `/glance?tab=${tab}`;
}
