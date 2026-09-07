export type SeededPipeline = {
  slug: string;
  name: string;
  kind: "shopping" | "parking";
  seeded: boolean;
  stages: { slug: string; name: string }[];
};

export type PipelineFieldId =
  | "title"
  | "insured"
  | "phone"
  | "email"
  | "address"
  | "line"
  | "state"
  | "city"
  | "coverageA"
  | "carrier"
  | "stage"
  | "updated"
  | "bound"
  | "tags";

export type PipelineFieldDef = {
  id: PipelineFieldId;
  label: string;
  defaultOn: boolean;
  required?: boolean;
};

/** Deal details that cards, columns, and the table can show or hide. Title stays on. */
export const PIPELINE_FIELDS: PipelineFieldDef[] = [
  { id: "title", label: "Deal title", defaultOn: true, required: true },
  { id: "insured", label: "Insured / contact", defaultOn: true },
  { id: "phone", label: "Phone", defaultOn: true },
  { id: "email", label: "Email", defaultOn: true },
  { id: "address", label: "Address", defaultOn: true },
  { id: "line", label: "Line", defaultOn: true },
  { id: "state", label: "State", defaultOn: true },
  { id: "city", label: "City", defaultOn: false },
  { id: "coverageA", label: "Coverage A", defaultOn: true },
  { id: "carrier", label: "Current carrier", defaultOn: false },
  { id: "stage", label: "Stage", defaultOn: false },
  { id: "updated", label: "Updated", defaultOn: false },
  { id: "bound", label: "Bound", defaultOn: false },
  { id: "tags", label: "Tags", defaultOn: true },
];

/**
 * Real switcher boards. Flood is a normal shopping board (not admin-added).
 * Won-Lost and Archive are separate parking tabs.
 */
export const SEEDED_PIPELINES: SeededPipeline[] = [
  {
    slug: "p-c",
    name: "P&C pipeline",
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
    slug: "flood",
    name: "Flood",
    kind: "shopping",
    seeded: true,
    stages: [
      { slug: "gather", name: "Gather Info" },
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
    stages: [
      { slug: "closed_won", name: "Closed Won" },
      { slug: "closed_lost", name: "Closed Lost" },
    ],
  },
  {
    slug: "archive",
    name: "Archive",
    kind: "parking",
    seeded: true,
    stages: [{ slug: "archive", name: "ARCHIVE" }],
  },
];

export type PipelineViewId = "board" | "table" | "funnel";

/** Deals owns the workspace. Table is the default (the list Javy already uses). */
export function parsePipelineView(raw?: string | null): PipelineViewId {
  if (raw === "board" || raw === "funnel") return raw;
  return "table";
}

export function dealsHref(opts: {
  pipeline?: string | null;
  view?: string | null;
  stage?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  family?: string | null;
  pcSub?: string | null;
  attention?: string | null;
} = {}) {
  const params = new URLSearchParams();
  if (opts.pipeline && opts.pipeline !== "all") params.set("pipeline", opts.pipeline);
  const parsed = parsePipelineView(opts.view);
  if (parsed !== "table") params.set("view", parsed);
  if (opts.stage) params.set("stage", opts.stage);
  if (opts.lifeSub) params.set("lifeSub", opts.lifeSub);
  if (opts.healthSub) params.set("healthSub", opts.healthSub);
  if (opts.family) params.set("family", opts.family);
  if (opts.pcSub) params.set("pcSub", opts.pcSub);
  if (opts.attention) params.set("attention", opts.attention);
  const qs = params.toString();
  return qs ? `/deals?${qs}` : "/deals";
}

export function pipelineHref(slug: string, view?: string, stage?: string) {
  return dealsHref({ pipeline: slug, view, stage });
}

export function pipelineTabLabel(board: { slug: string; name: string }) {
  if (board.slug === "p-c") return "P&C";
  return board.name;
}

export function pipelinePageTitle(board: { name: string }) {
  return /pipeline/i.test(board.name) ? board.name : `${board.name} pipeline`;
}

export function isAdminPipelineBadge(_board: { slug: string; seeded: boolean }) {
  return false;
}

export function isClosedWonStage(slug: string | null | undefined) {
  return slug === "closed_won" || slug === "bound";
}

export function isClosedLostStage(slug: string | null | undefined) {
  return slug === "closed_lost" || slug === "lost";
}

export function isArchiveStage(slug: string | null | undefined) {
  return slug === "archive";
}

export function isArchivedDeal(deal: {
  archivedAt?: Date | string | null;
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
}) {
  return Boolean(deal.archivedAt) || isArchiveStage(deal.pipelineStageSlug) || isArchiveStage(deal.pipelineStage);
}

export function dealStageKey(deal: {
  pipelineStage: string;
  pipelineStageSlug?: string | null;
}) {
  return deal.pipelineStageSlug || deal.pipelineStage;
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
  if (slug === "shopping") return "shopping";
  return "shopping";
}

/** Legacy `pipeline_stage` names → board slugs so both move paths stay in sync. */
export function pipelineSlugForDealStage(stage: string) {
  if (stage === "shopping") return "gather";
  if (stage === "quoting") return "quotes";
  if (stage === "bound") return "closed_won";
  if (stage === "lost") return "closed_lost";
  return stage;
}

export function resolveStageMove(input: string): {
  pipelineStage: string;
  pipelineStageSlug: string;
} {
  const raw = input.trim();
  const slug = pipelineSlugForDealStage(raw);
  return {
    pipelineStageSlug: slug,
    pipelineStage: dealStageForPipeline(slug),
  };
}

export function isKnownStageToken(value: string) {
  const known = new Set([
    "shopping",
    "quoting",
    "quote_sent",
    "bound",
    "lost",
    "archive",
    "gather",
    "quotes",
    "review",
    "closed_won",
    "closed_lost",
  ]);
  return known.has(value);
}

export function dealMatchesStage(
  deal: {
    pipelineStage: string;
    pipelineStageSlug?: string | null;
    archivedAt?: Date | string | null;
  },
  stageSlug: string,
) {
  if (stageSlug === "archive") return isArchivedDeal(deal);
  if (isArchivedDeal(deal)) return false;
  const key = dealStageKey(deal);
  if (stageSlug === "closed_won") return isClosedWonStage(key) || isClosedWonStage(deal.pipelineStage);
  if (stageSlug === "closed_lost") return isClosedLostStage(key) || isClosedLostStage(deal.pipelineStage);
  if (stageSlug === "quote_sent") return key === "quote_sent" || deal.pipelineStage === "quote_sent";
  if (stageSlug === "gather") {
    return key === "gather" || key === "shopping" || deal.pipelineStage === "shopping";
  }
  return key === stageSlug;
}

export function dealMatchesBoard(
  deal: {
    pipelineId?: string | null;
    pipelineStage: string;
    pipelineStageSlug?: string | null;
    archivedAt?: Date | string | null;
  },
  board: { id: string; slug: string; kind: string },
) {
  if (board.slug === "archive") return isArchivedDeal(deal);
  if (isArchivedDeal(deal)) return false;
  if (board.slug === "won-lost") {
    const key = dealStageKey(deal);
    return isClosedWonStage(key) || isClosedWonStage(deal.pipelineStage) || isClosedLostStage(key) || isClosedLostStage(deal.pipelineStage);
  }
  return deal.pipelineId === board.id;
}

export function defaultPipelineFieldIds() {
  return PIPELINE_FIELDS.filter((field) => field.defaultOn).map((field) => field.id);
}

export function parsePipelineFields(raw: string | null | undefined): PipelineFieldId[] {
  const allowed = new Set(PIPELINE_FIELDS.map((field) => field.id));
  const picked = (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is PipelineFieldId => allowed.has(part as PipelineFieldId));
  if (picked.length === 0) return defaultPipelineFieldIds();
  const required = PIPELINE_FIELDS.filter((field) => field.required).map((field) => field.id);
  const next = [...picked];
  for (const id of required) {
    if (!next.includes(id)) next.unshift(id);
  }
  return next;
}

export function collapsedStorageKey(pipelineSlug: string) {
  return `ff-pipe-collapse:${pipelineSlug}`;
}

export function parseCollapsedStages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

export function pipelineFunnelRows<
  TStage extends { slug: string; name: string; color?: string | null },
  TCard extends {
    pipelineStage: string;
    pipelineStageSlug?: string | null;
    archivedAt?: Date | string | null;
  },
>(stages: TStage[], cards: TCard[]) {
  return stages.map((stage) => ({
    slug: stage.slug,
    name: stage.name,
    color: stage.color ?? null,
    count: cards.filter((card) => dealMatchesStage(card, stage.slug)).length,
  }));
}

export function switcherBoards<T extends { slug: string; name: string; sortOrder?: number }>(boards: T[]) {
  const order = SEEDED_PIPELINES.map((board) => board.slug);
  return [...boards].sort((a, b) => {
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    if (ai === -1 && bi === -1) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
