export const SETTINGS_ROLE_MATRIX = [
  {
    id: "owner",
    title: "Owner",
    hint: "Same keys as Admin on this desk",
    blurb: "Agency owner. Full chrome, all-book, Settings, and billing. Treated as Admin for privileges.",
  },
  {
    id: "admin",
    title: "Admin",
    hint: "Agency chrome + all book",
    blurb: "Runs the agency. Connects vendors, writes playbooks, and sees the whole client book.",
  },
  {
    id: "agent",
    title: "Agent",
    hint: "Own book unless agency-book is on",
    blurb: "Producer. Own book by default. Per-agent canSeeAgencyWidgets (agency-book) and the Team-scope toggle below decide company widgets.",
  },
  {
    id: "developer",
    title: "Developer",
    hint: "Not a producer",
    blurb: "Chrome profile for Developer Hub. Not Admin and not a producer. Agency widgets on by default; no client book of their own.",
  },
] as const;
