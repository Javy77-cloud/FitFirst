/** Calm palette for stages and statuses. Contrast is on light paper, not neon. */

/** Full calm CRM palette — every color picker (stages, statuses, lists) shares this. */
export const STATUS_COLOR_KEYS = [
  "blue",
  "sky",
  "cyan",
  "teal",
  "emerald",
  "green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "purple",
  "violet",
  "indigo",
  "slate",
  "stone",
  "gray",
] as const;
export type StatusColorKey = (typeof STATUS_COLOR_KEYS)[number];

export const STAGE_COLOR_ROTATION = [
  "blue",
  "teal",
  "amber",
  "violet",
  "green",
  "rose",
  "sky",
  "orange",
  "indigo",
  "cyan",
  "pink",
  "emerald",
  "yellow",
  "fuchsia",
  "lime",
  "purple",
  "red",
  "stone",
] as const;

const STAGE_COLOR_BY_SLUG: Record<string, StatusColorKey> = {
  gather: "blue",
  gather_info: "blue",
  shopping: "blue",
  quotes: "teal",
  quoting: "teal",
  meet_quotes: "teal",
  review: "amber",
  comparing: "amber",
  quote_sent: "violet",
  bound: "orange",
  pending_inspection: "amber",
  closed_won: "green",
  closed_lost: "rose",
  lost: "rose",
  archive: "slate",
};

const POLICY_STATUS_COLOR: Record<string, StatusColorKey> = {
  active: "green",
  inactive: "slate",
  bound: "orange",
  pending: "amber",
  lapse: "rose",
  lapsed: "rose",
  cancellation: "rose",
  cancelled: "rose",
  canceled: "rose",
  non_renewal: "violet",
  expired: "slate",
};

const TEMP_STATUS_COLOR: Record<string, StatusColorKey> = {
  hot: "rose",
  warm: "amber",
  cold: "blue",
};

const GENERIC_STATUS_COLOR: Record<string, StatusColorKey> = {
  requested: "blue",
  scheduled: "teal",
  completed: "green",
  drafted: "amber",
  ready: "teal",
  mailed: "violet",
  withdrawn: "slate",
  in_progress: "amber",
  filed: "green",
  past_due: "rose",
  quoted: "teal",
  declined: "rose",
  skip: "slate",
  open: "blue",
  closed: "slate",
  inquiry: "blue",
  referred: "violet",
  issued: "green",
  signed: "green",
  sent: "teal",
  draft: "amber",
  file: "green",
  start: "amber",
  note: "slate",
  waived: "slate",
  due: "amber",
  received: "green",
  moved: "violet",
  added: "teal",
  removed: "slate",
  saved: "green",
  archived: "slate",
  won: "green",
};

const CLIENT_STATUS_COLOR: Record<string, StatusColorKey> = {
  client: "green",
  former_client: "orange",
  not_a_client: "slate",
  prospect: "blue",
  lead: "teal",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  bound: "Bound",
  pending: "Pending",
  lapse: "Lapse",
  lapsed: "Lapse",
  cancellation: "Cancellation",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  non_renewal: "Non-renewal",
  expired: "Expired",
  client: "Client",
  former_client: "Former Client",
  not_a_client: "Not a client",
  prospect: "Prospect",
  lead: "Lead",
};

export const STATUS_COLOR_CLASS: Record<StatusColorKey, string> = {
  blue: "border-[#9bb8d6] bg-[#d7e6f6] text-[#163a68]",
  sky: "border-[#9ec9e8] bg-[#e0f2fe] text-[#075985]",
  cyan: "border-[#8ecad8] bg-[#cffafe] text-[#155e75]",
  teal: "border-[#8ec4b8] bg-[#d7efe8] text-[#0f5c52]",
  emerald: "border-[#8fcbb0] bg-[#d1fae5] text-[#065f46]",
  green: "border-[#9dceb3] bg-[#e4f5ec] text-[#1f7a4d]",
  lime: "border-[#c5d98a] bg-[#ecfccb] text-[#3f6212]",
  yellow: "border-[#e4d47a] bg-[#fef9c3] text-[#854d0e]",
  amber: "border-[#e0c56a] bg-[#fff4d1] text-[#8a6500]",
  orange: "border-[#e8c3a4] bg-[#ffedd5] text-[#b4532a]",
  red: "border-[#e8a0b0] bg-[#FCE8EC] text-[#BF0A30]",
  rose: "border-[#e8b4af] bg-[#fde8e6] text-[#9f1239]",
  pink: "border-[#e9b0c8] bg-[#fce7f3] text-[#9d174d]",
  fuchsia: "border-[#e0a8d8] bg-[#fae8ff] text-[#86198f]",
  purple: "border-[#d0b4e8] bg-[#f3e8ff] text-[#6b21a8]",
  violet: "border-[#c4b5e8] bg-[#e8e0f5] text-[#4c1d95]",
  indigo: "border-[#b4bce8] bg-[#e0e7ff] text-[#3730a3]",
  slate: "border-[#c5d0db] bg-[#e8eef4] text-[#334155]",
  stone: "border-[#d0c8be] bg-[#f5f5f4] text-[#44403c]",
  gray: "border-[#c8cdd4] bg-[#f3f4f6] text-[#374151]",
};

export const STATUS_COLOR_STYLE: Record<StatusColorKey, { backgroundColor: string; borderColor: string; color: string }> = {
  blue: { backgroundColor: "#d7e6f6", borderColor: "#9bb8d6", color: "#163a68" },
  sky: { backgroundColor: "#e0f2fe", borderColor: "#9ec9e8", color: "#075985" },
  cyan: { backgroundColor: "#cffafe", borderColor: "#8ecad8", color: "#155e75" },
  teal: { backgroundColor: "#d7efe8", borderColor: "#8ec4b8", color: "#0f5c52" },
  emerald: { backgroundColor: "#d1fae5", borderColor: "#8fcbb0", color: "#065f46" },
  green: { backgroundColor: "#e4f5ec", borderColor: "#9dceb3", color: "#1f7a4d" },
  lime: { backgroundColor: "#ecfccb", borderColor: "#c5d98a", color: "#3f6212" },
  yellow: { backgroundColor: "#fef9c3", borderColor: "#e4d47a", color: "#854d0e" },
  amber: { backgroundColor: "#fff4d1", borderColor: "#e0c56a", color: "#8a6500" },
  orange: { backgroundColor: "#ffedd5", borderColor: "#e8c3a4", color: "#b4532a" },
  red: { backgroundColor: "#FCE8EC", borderColor: "#e8a0b0", color: "#BF0A30" },
  rose: { backgroundColor: "#fde8e6", borderColor: "#e8b4af", color: "#9f1239" },
  pink: { backgroundColor: "#fce7f3", borderColor: "#e9b0c8", color: "#9d174d" },
  fuchsia: { backgroundColor: "#fae8ff", borderColor: "#e0a8d8", color: "#86198f" },
  purple: { backgroundColor: "#f3e8ff", borderColor: "#d0b4e8", color: "#6b21a8" },
  violet: { backgroundColor: "#e8e0f5", borderColor: "#c4b5e8", color: "#4c1d95" },
  indigo: { backgroundColor: "#e0e7ff", borderColor: "#b4bce8", color: "#3730a3" },
  slate: { backgroundColor: "#e8eef4", borderColor: "#c5d0db", color: "#334155" },
  stone: { backgroundColor: "#f5f5f4", borderColor: "#d0c8be", color: "#44403c" },
  gray: { backgroundColor: "#f3f4f6", borderColor: "#c8cdd4", color: "#374151" },
};

export const STATUS_BAR_CLASS: Record<StatusColorKey, string> = {
  blue: "bg-[#1d4e89]",
  sky: "bg-[#0369a1]",
  cyan: "bg-[#0e7490]",
  teal: "bg-[#0f766e]",
  emerald: "bg-[#047857]",
  green: "bg-[#1f7a4d]",
  lime: "bg-[#4d7c0f]",
  yellow: "bg-[#a16207]",
  amber: "bg-[#b45309]",
  orange: "bg-[#b4532a]",
  red: "bg-[#BF0A30]",
  rose: "bg-[#9f1239]",
  pink: "bg-[#be185d]",
  fuchsia: "bg-[#a21caf]",
  purple: "bg-[#7e22ce]",
  violet: "bg-[#6d28d9]",
  indigo: "bg-[#4338ca]",
  slate: "bg-[#475569]",
  stone: "bg-[#57534e]",
  gray: "bg-[#4b5563]",
};

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function isStatusColorKey(value: string | null | undefined): value is StatusColorKey {
  return Boolean(value && (STATUS_COLOR_KEYS as readonly string[]).includes(value));
}

export function statusColorClass(color: string | null | undefined): string {
  return STATUS_COLOR_CLASS[resolveColorKey(color)];
}

export function statusBarClass(color: string | null | undefined): string {
  return STATUS_BAR_CLASS[resolveColorKey(color)];
}

export function resolveColorKey(color: string | null | undefined): StatusColorKey {
  const key = (color ?? "").trim().toLowerCase();
  return isStatusColorKey(key) ? key : "slate";
}

export function defaultStageColor(
  sortOrder = 0,
  slug?: string | null,
): StatusColorKey {
  const key = normalizeKey(slug);
  if (key && STAGE_COLOR_BY_SLUG[key]) return STAGE_COLOR_BY_SLUG[key];
  const index =
    ((sortOrder % STAGE_COLOR_ROTATION.length) + STAGE_COLOR_ROTATION.length) %
    STAGE_COLOR_ROTATION.length;
  return STAGE_COLOR_ROTATION[index];
}

export function stageColorFromNameOrSlug(
  stage: string | null | undefined,
  color?: string | null,
): StatusColorKey {
  if (isStatusColorKey(color)) return color;
  return defaultStageColor(0, stage);
}

export function policyStatusColor(status: string | null | undefined): StatusColorKey {
  const key = normalizeKey(status);
  return POLICY_STATUS_COLOR[key] ?? "slate";
}

export function clientStatusColor(status: string | null | undefined): StatusColorKey {
  const key = normalizeKey(status);
  return CLIENT_STATUS_COLOR[key] ?? "slate";
}

export function tempColor(temperature: string | null | undefined): StatusColorKey {
  const key = normalizeKey(temperature);
  return TEMP_STATUS_COLOR[key] ?? "rose";
}

export function statusColorFor(value: string | null | undefined): StatusColorKey {
  const key = normalizeKey(value);
  if (isStatusColorKey(key)) return key;
  if (POLICY_STATUS_COLOR[key]) return POLICY_STATUS_COLOR[key];
  if (CLIENT_STATUS_COLOR[key]) return CLIENT_STATUS_COLOR[key];
  if (TEMP_STATUS_COLOR[key]) return TEMP_STATUS_COLOR[key];
  if (GENERIC_STATUS_COLOR[key]) return GENERIC_STATUS_COLOR[key];
  const parts = key.split("_").filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const slice = parts.slice(i).join("_");
    if (GENERIC_STATUS_COLOR[slice]) return GENERIC_STATUS_COLOR[slice];
    if (POLICY_STATUS_COLOR[slice]) return POLICY_STATUS_COLOR[slice];
  }
  return "slate";
}

export function displayStatusLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const key = normalizeKey(raw);
  return STATUS_LABEL[key] ?? raw.replaceAll("_", " ");
}
