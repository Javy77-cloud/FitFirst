export type HelpTab = "howto" | "faq" | "videos";

export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  body: string[];
};

export type HelpFaq = {
  id: string;
  q: string;
  a: string;
};

export type HelpVideo = {
  id: string;
  title: string;
  articleId: string;
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "start-shop",
    title: "Start Shop",
    summary: "Turn a lead into a shopping deal. Nothing is bound yet.",
    body: [
      "On Leads, Start shop opens a shopping deal and an empty Quote Sheet.",
      "Pick personal or commercial if you know the line. Default is homeowners.",
      "A dropped dec becomes a lead first. The deal is the shop. Quotes still do not create a policy.",
    ],
  },
  {
    id: "quote-sheet",
    title: "Quote Sheet",
    summary: "One worksheet per shop. Yellow and blue cells still need a glance.",
    body: [
      "Upload a source dec on the deal, then fill blanks. High-confidence extract can land automatically.",
      "Flagged fields stay off the master risk until you accept them.",
      "Super-Copy and Forms Fill read this same sheet. Do not keep a second worksheet.",
    ],
  },
  {
    id: "bind-vs-quote",
    title: "Bind vs quote",
    summary: "A quote is a number. Bind is the only step that creates a policy.",
    body: [
      "Quoted, declined, and floor-only results stay on the deal.",
      "Bind creates the Contact or Account and the Policy. Not before.",
      "A quote is not coverage. Bind is the only step that creates a policy.",
    ],
  },
  {
    id: "calendar",
    title: "Calendar",
    summary: "In-desk month, week, and day. Connected Google or Outlook events show by title.",
    body: [
      "Row 1 is Add event / Add company meeting / Add training. Company meeting and training stay Admin.",
      "Row 2 is Month / Week / Day. Row 3 is Task / Meeting / Call / Email / SMS.",
      "Add event or a type on row 3, or double-click a day or hour. Drag an item to move it.",
      "Deal and lead items also show on that record’s Quick Communications board.",
      "Sync pulls titled Google (or Outlook) events onto the grid. FitFirst-created timed events write back. G/O chips are external; private events stay Busy or Private event.",
    ],
  },
  {
    id: "florida-ho3",
    title: "Florida HO3 shop",
    summary: "Coastal wind, roof age, and Coverage A drive appetite more than a pretty quote PDF.",
    body: [
      "Brevard and other east-coast shops need miles-to-coast, roof year, and opening protection on the sheet.",
      "Clay tile plus metal still uses the roof year on file. Do not invent a 2023 roof.",
      "Flood is its own shop (NFIP or private). It is not a checkbox on the HO3.",
    ],
  },
  {
    id: "personal-vs-commercial",
    title: "Personal vs commercial",
    summary: "The line book picks the pipeline and the bind target.",
    body: [
      "Personal: HO, auto, flood, umbrella. Bind creates a Contact.",
      "Commercial: GL, BOP, WC, and the rest. Bind creates an Account.",
      "Commercial bind creates an Account. Personal bind creates a Contact.",
    ],
  },
];

export const HELP_FAQ: HelpFaq[] = [
  {
    id: "ana",
    q: "Why can’t I turn a quote into a policy?",
    a: "Quotes attach to the deal. A policy exists only after bind / Closed Won.",
  },
  {
    id: "quote-policy",
    q: "Does a quote create a policy?",
    a: "No. Quotes attach to the deal. A policy exists only after bind.",
  },
  {
    id: "start-shop-error",
    q: "Start shop failed. What now?",
    a: "The desk now picks the tenant pipeline or the first board. If you still see an error, the lead row is missing — open the lead and try again.",
  },
  {
    id: "dec-upload",
    q: "Where does a dropped dec live?",
    a: "On the deal as a source document. It feeds the Quote Sheet. It is not an issued policy file.",
  },
  {
    id: "comms",
    q: "Where do I log a call or SMS?",
    a: "Deal and Lead: Quick Communications. Contact, Account, and Policy: the activity timeline.",
  },
  {
    id: "calendar-sync",
    q: "Does Calendar sync to Google or Outlook?",
    a: "Yes. Sync pulls titled Google or Outlook events onto the desk. FitFirst timed events write back.",
  },
  {
    id: "flood",
    q: "Is flood part of the HO3?",
    a: "No. Flood is its own shop and its own pipeline. Start a separate deal.",
  },
  {
    id: "citizens",
    q: "How do I treat Citizens or takeout?",
    a: "Mark the market result on the deal (quoted, floor-only, takeout-only, portal closed). That is not a bind.",
  },
];

export const HELP_VIDEOS: HelpVideo[] = [
  { id: "quote-sheet", title: "Quote Sheet", articleId: "quote-sheet" },
  { id: "bind-vs-quote", title: "Bind vs Quote", articleId: "bind-vs-quote" },
  { id: "calendar", title: "Calendar", articleId: "calendar" },
  { id: "start-shop", title: "Start Shop", articleId: "start-shop" },
];

export function articleById(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.id === id);
}

export function parseSupportQuery(raw: string | null): { tab: HelpTab; articleId: string | null } | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "help" || value === "howto") return { tab: "howto", articleId: null };
  if (value === "faq" || value === "qa") return { tab: "faq", articleId: null };
  if (value === "videos" || value === "video") return { tab: "videos", articleId: null };
  if (HELP_ARTICLES.some((article) => article.id === value)) {
    return { tab: "howto", articleId: value };
  }
  return { tab: "howto", articleId: null };
}
