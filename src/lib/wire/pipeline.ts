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
  { id: "phone", label: "Phone", defaultOn: false },
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

/** Agency P&C board — Home / Auto / Flood / other PC lines share this set. */
export const PC_SHOPPING_STAGES: { slug: string; name: string }[] = [
  { slug: "gathering", name: "Gathering" },
  { slug: "markets", name: "Markets" },
  { slug: "quote_review", name: "Quote review" },
  { slug: "quote_sent", name: "Quote sent" },
  { slug: "bound", name: "Bound" },
  { slug: "policy_issued", name: "Policy issued" },
  { slug: "closed_won", name: "Closed won" },
  { slug: "closed_lost", name: "Closed lost" },
];

/** Life / Health default to the same seed as P&C; each board is independently editable. */
export const LIFE_HEALTH_STAGES: { slug: string; name: string }[] = [...PC_SHOPPING_STAGES];

/** Admin ⋮ Edit stages — P&C, Life, and Health shopping boards. */
export const EDITABLE_DEAL_PIPELINE_SLUGS = ["p-c", "health", "life"] as const;

/**
 * Real switcher boards. Flood is a normal shopping board (not admin-added).
 * Won-Lost and Archived are separate parking tabs.
 */
export const SEEDED_PIPELINES: SeededPipeline[] = [
  {
    slug: "p-c",
    name: "P&C pipeline",
    kind: "shopping",
    seeded: true,
    stages: [...PC_SHOPPING_STAGES],
  },
  {
    slug: "health",
    name: "Health",
    kind: "shopping",
    seeded: true,
    stages: [...LIFE_HEALTH_STAGES],
  },
  {
    slug: "life",
    name: "Life",
    kind: "shopping",
    seeded: true,
    stages: [...LIFE_HEALTH_STAGES],
  },
  {
    slug: "flood",
    name: "Flood",
    kind: "shopping",
    seeded: true,
    stages: [...PC_SHOPPING_STAGES],
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
    slug: "handled",
    name: "Handled",
    kind: "parking",
    seeded: true,
    stages: [{ slug: "handled", name: "Handled" }],
  },
  {
    slug: "archive",
    name: "Archived",
    kind: "parking",
    seeded: true,
    stages: [{ slug: "archive", name: "Archived" }],
  },
];

export type PipelineViewId = "list" | "grid" | "board" | "funnel";
export const RENEWALS_VIEWS = ["board", "stack", "list"] as const;
export type RenewalsViewId = (typeof RENEWALS_VIEWS)[number];

export function isRenewalsViewId(raw?: string | null): raw is RenewalsViewId {
  return raw === "board" || raw === "stack" || raw === "list";
}

/** Deals owns the workspace. List is the default (the table Javy already uses). */
export function parsePipelineView(raw?: string | null): PipelineViewId {
  if (raw === "board" || raw === "funnel" || raw === "grid") return raw;
  if (raw === "list" || raw === "table") return "list";
  return "list";
}

export function isPipelineSheetView(view: PipelineViewId): boolean {
  return view === "list" || view === "grid";
}

export type PipelineDeskHrefOpts = {
  pipeline?: string | null;
  view?: string | null;
  stage?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  family?: string | null;
  pcSub?: string | null;
  attention?: string | null;
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  valueBand?: string | null;
};

export type PipelineDeskBasePath = "/deals" | "/renewals";

/** Urgency board is the default. List is the column sheet. Funnel/kanban stay on the board. */
export function parseRenewalsView(raw?: string | null): RenewalsViewId {
  if (raw === "stack" || raw === "list") return raw;
  if (raw === "table" || raw === "grid") return "list";
  return "board";
}

export function pipelineDeskHref(basePath: PipelineDeskBasePath, opts: PipelineDeskHrefOpts = {}) {
  const params = new URLSearchParams();
  if (opts.pipeline && opts.pipeline !== "all") params.set("pipeline", opts.pipeline);
  // When view is provided (including list), always write it so URL wins over cookie default.
  if (opts.view != null && String(opts.view).length > 0) {
    const raw = String(opts.view);
    const view =
      basePath === "/renewals"
        ? parseRenewalsView(raw)
        : raw === "stack" || raw === "radar" || raw === "list"
          ? raw
          : parsePipelineView(raw);
    params.set("view", view);
  }
  if (opts.stage) params.set("stage", opts.stage);
  if (opts.lifeSub) params.set("lifeSub", opts.lifeSub);
  if (opts.healthSub) params.set("healthSub", opts.healthSub);
  if (opts.family) params.set("family", opts.family);
  if (opts.pcSub) params.set("pcSub", opts.pcSub);
  if (opts.attention) params.set("attention", opts.attention);
  if (opts.heat) params.set("heat", opts.heat);
  if (opts.lens) params.set("lens", opts.lens);
  if (opts.scope) params.set("scope", opts.scope);
  if (opts.valueBand) params.set("valueBand", opts.valueBand);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function dealsHref(opts: PipelineDeskHrefOpts = {}) {
  return pipelineDeskHref("/deals", opts);
}

export function renewalsHref(opts: PipelineDeskHrefOpts = {}) {
  return pipelineDeskHref("/renewals", opts);
}

/** New ↔ Renewals does not carry Stack/Radar onto Renewals or Board/Stack onto Deals. */
export function pipelineBookToggleHrefs(
  view?: string | null,
  book: "new" | "renewals" = "new",
): {
  newHref: string;
  renewalsHref: string;
} {
  if (book === "renewals") {
    return {
      newHref: "/deals",
      renewalsHref: view ? renewalsHref({ view: parseRenewalsView(view) }) : "/renewals",
    };
  }
  if (view === "stack" || view === "radar" || view === "list") {
    return {
      newHref: dealsHref({ view }),
      renewalsHref: "/renewals",
    };
  }
  return {
    newHref: "/deals",
    renewalsHref: "/renewals",
  };
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
  // Bound is its own board stage; Closed Won matches closed_won / legacy won only.
  return slug === "closed_won" || slug === "won";
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
  const key = canonicalizePipelineSlug(slug);
  if (key === "closed_won") return "closed_won";
  if (key === "bound") return "bound";
  if (key === "policy_issued") return "policy_issued";
  if (key === "closed_lost") return "lost";
  if (key === "archive") return "archive";
  if (key === "quote_sent") return "quote_sent";
  if (key === "quote_review") return "quote_review";
  if (key === "markets") return "markets";
  if (key === "gathering") return "gathering";
  return key || "gathering";
}

const PIPELINE_SLUG_ALIASES: Record<string, string> = {
  gather: "gathering",
  gather_info: "gathering",
  shopping: "gathering",
  quotes: "markets",
  meet_quotes: "markets",
  quoting: "markets",
  review: "quote_review",
  comparing: "quote_review",
  pending_inspection: "bound",
  lost: "closed_lost",
};

export function canonicalizePipelineSlug(stage?: string | null): string {
  const key = (stage ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return PIPELINE_SLUG_ALIASES[key] ?? key;
}

/** Legacy `pipeline_stage` names → board slugs so both move paths stay in sync. */
export function pipelineSlugForDealStage(stage: string) {
  return canonicalizePipelineSlug(stage) || stage;
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
    "policy_issued",
    "pending_inspection",
    "lost",
    "archive",
    "gather",
    "gathering",
    "quotes",
    "markets",
    "review",
    "quote_review",
    "closed_won",
    "closed_lost",
  ]);
  return known.has(value) || known.has(canonicalizePipelineSlug(value));
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
  const wanted = canonicalizePipelineSlug(stageSlug);
  const key = canonicalizePipelineSlug(dealStageKey(deal));
  if (wanted === "closed_won") {
    // Prefer board slug when set so Elena (slug closed_won, legacy stage bound) stays on Closed Won.
    if (deal.pipelineStageSlug) {
      return deal.pipelineStageSlug === "closed_won" || deal.pipelineStageSlug === "won";
    }
    return deal.pipelineStage === "closed_won" || deal.pipelineStage === "won";
  }
  if (wanted === "closed_lost") return isClosedLostStage(key) || isClosedLostStage(deal.pipelineStage);
  if (wanted === "quote_sent") return key === "quote_sent";
  if (wanted === "bound") {
    return key === "bound";
  }
  if (wanted === "policy_issued") return key === "policy_issued";
  if (wanted === "quote_review") return key === "quote_review";
  if (wanted === "markets") return key === "markets";
  if (wanted === "gathering") {
    return key === "gathering";
  }
  return key === wanted;
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
