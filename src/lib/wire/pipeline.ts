export type SeededPipeline = {
  slug: string;
  name: string;
  kind: "shopping" | "parking";
  seeded: boolean;
  stages: { slug: string; name: string }[];
};

/** Real switcher boards. Flood is the admin-added extra board. */
export const SEEDED_PIPELINES: SeededPipeline[] = [
  {
    slug: "p-c",
    name: "P-C",
    kind: "shopping",
    seeded: true,
    stages: [
      { slug: "gather", name: "Gather Info" },
      { slug: "quotes", name: "Meet / Quotes" },
      { slug: "review", name: "Review" },
      { slug: "quote_sent", name: "Quote Sent" },
      { slug: "closed_won", name: "Closed Won" },
      { slug: "closed_lost", name: "Closed Lost" },
    ],
  },
  {
    slug: "health",
    name: "Health",
    kind: "shopping",
    seeded: true,
    stages: [
      { slug: "gather", name: "Gather Info" },
      { slug: "review", name: "Review" },
      { slug: "quote_sent", name: "Quote Sent" },
      { slug: "closed_won", name: "Closed Won" },
      { slug: "closed_lost", name: "Closed Lost" },
    ],
  },
  {
    slug: "life",
    name: "Life",
    kind: "shopping",
    seeded: true,
    stages: [
      { slug: "gather", name: "Gather Info" },
      { slug: "review", name: "Review" },
      { slug: "quote_sent", name: "Quote Sent" },
      { slug: "closed_won", name: "Closed Won" },
      { slug: "closed_lost", name: "Closed Lost" },
    ],
  },
  {
    slug: "won-lost",
    name: "Won-Lost",
    kind: "parking",
    seeded: true,
    stages: [{ slug: "archive", name: "ARCHIVE" }],
  },
  {
    slug: "flood",
    name: "Flood",
    kind: "shopping",
    seeded: false,
    stages: [
      { slug: "gather", name: "Gather Info" },
      { slug: "quote_sent", name: "Quote Sent" },
      { slug: "closed_won", name: "Closed Won" },
      { slug: "closed_lost", name: "Closed Lost" },
    ],
  },
];

export function pipelineHref(slug: string) {
  return `/pipeline?pipeline=${encodeURIComponent(slug)}`;
}

export function isClosedWonStage(slug: string | null | undefined) {
  return slug === "closed_won" || slug === "bound";
}

export function isArchiveStage(slug: string | null | undefined) {
  return slug === "archive";
}

/** ARCHIVE later must not cancel emails hung on won date. */
export function archiveCancelsEmailJobs(): false {
  return false;
}

export function nextMorning(from: Date) {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(12, 0, 0, 0);
  return next;
}

export function dealStageForPipeline(slug: string) {
  if (slug === "closed_won") return "bound";
  if (slug === "closed_lost") return "lost";
  if (slug === "archive") return "archive";
  if (slug === "quote_sent") return "quote_sent";
  if (slug === "quotes" || slug === "review") return "quoting";
  return "shopping";
}
