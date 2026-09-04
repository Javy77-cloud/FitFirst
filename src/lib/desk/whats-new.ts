/** In-desk changelog for the header What’s New panel. Stub entries only. */

export type WhatsNewEntry = {
  id: string;
  title: string;
  body: string;
  date: string;
};

export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    id: "top-chrome",
    title: "Top chrome utilities",
    body: "The header holds Smart Search, Alerts (the bell is the alerts module), What’s New, profile, recently accessed, and quick add. Alerts and Search are off the left nav.",
    date: "2026-09-04",
  },
  {
    id: "admin-agent-login",
    title: "Admin vs Agent login",
    body: "Javy sees the whole book. Maya sees her own book. The same top chrome is visible to both — including Support.",
    date: "2026-09-03",
  },
  {
    id: "quote-sheet-gate",
    title: "Quote Sheet approve gate",
    body: "Visual review unlocks quoting. Super-Copy, Send to Fill, and Chrome Fill read the same sheet row.",
    date: "2026-09-02",
  },
  {
    id: "calendar-board",
    title: "Calendar month / week / day",
    body: "Hourly slots, type colors, drag-drop reschedule, and + Add event for any type. Google Calendar stays a stub.",
    date: "2026-08-28",
  },
];

export function listWhatsNew(): WhatsNewEntry[] {
  return [...WHATS_NEW_ENTRIES];
}
