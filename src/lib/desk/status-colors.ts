/** Calm palette for stages and statuses. Contrast is on light paper, not neon. */

export const STATUS_COLOR_KEYS = [
  "blue",
  "teal",
  "amber",
  "violet",
  "green",
  "rose",
  "slate",
  "orange",
] as const;
export type StatusColorKey = (typeof STATUS_COLOR_KEYS)[number];

export const STAGE_COLOR_ROTATION = ["blue", "teal", "amber", "violet", "green", "rose"] as const;

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
  closed_won: "green",
  bound: "green",
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
  blue: "bg-[#d7e6f6] text-[#163a68]",
  teal: "bg-[#d7efe8] text-[#0f5c52]",
  amber: "bg-[#fff4d1] text-[#8a6500]",
  violet: "bg-[#e8e0f5] text-[#4c1d95]",
  green: "bg-[#e4f5ec] text-[#1f7a4d]",
  rose: "bg-[#fde8e6] text-[#9f1239]",
  slate: "bg-[#e8eef4] text-[#334155]",
  orange: "bg-[#ffedd5] text-[#b4532a]",
};

export const STATUS_BAR_CLASS: Record<StatusColorKey, string> = {
  blue: "bg-[#1d4e89]",
  teal: "bg-[#0f766e]",
  amber: "bg-[#b4532a]",
  violet: "bg-[#6d28d9]",
  green: "bg-[#1f7a4d]",
  rose: "bg-[#9f1239]",
  slate: "bg-[#475569]",
  orange: "bg-[#b4532a]",
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

export function displayStatusLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const key = normalizeKey(raw);
  return STATUS_LABEL[key] ?? raw.replaceAll("_", " ");
}
