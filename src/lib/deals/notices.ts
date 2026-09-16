import type { PicklistOption } from "@/lib/custom-fields/picklists";

/** Seed notice types. `none` is reserved and not stored on the agency picklist. */
export const SEED_NOTICE_TYPES = [
  "none",
  "inspection_before_bind",
  "check_mortgagee_payment",
] as const;
export type SeedNoticeType = (typeof SEED_NOTICE_TYPES)[number];

/** Stored slug — seed types plus agency-added picklist values. */
export type NoticeType = string;

export const SEED_NOTICE_LABELS: Record<SeedNoticeType, string> = {
  none: "None",
  inspection_before_bind: "Inspection before bind",
  check_mortgagee_payment: "Check mortgagee payment",
};

/** Neon / leftover Inspection dropdown slugs. */
export const NOTICE_TYPE_ALIASES: Record<string, NoticeType> = {
  none: "none",
  no_inspection: "none",
  before_bind: "inspection_before_bind",
  inspection_before_bind: "inspection_before_bind",
  carrier_post_bind: "check_mortgagee_payment",
  check_mortgagee_payment: "check_mortgagee_payment",
};

const LABEL_ALIASES: Record<string, NoticeType> = {
  none: "none",
  "no inspection": "none",
  "inspection before bind": "inspection_before_bind",
  "check mortgagee payment": "check_mortgagee_payment",
  "carrier post-bind inspection": "check_mortgagee_payment",
  "carrier post bind inspection": "check_mortgagee_payment",
};

export type NoticeTypeOption = {
  value: NoticeType;
  label: string;
};

export const SEED_NOTICE_TYPE_OPTIONS: NoticeTypeOption[] = SEED_NOTICE_TYPES.map((value) => ({
  value,
  label: SEED_NOTICE_LABELS[value],
}));

/** Settings → Picklists starter — agency add / rename / remove. */
export const DEAL_NOTICE_PICKLIST_OPTIONS = [
  SEED_NOTICE_LABELS.inspection_before_bind,
  SEED_NOTICE_LABELS.check_mortgagee_payment,
] as const;

export function noticeTypeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function parseNoticeType(value: unknown): NoticeType {
  if (typeof value !== "string") return "none";
  const trimmed = value.trim();
  if (!trimmed) return "none";
  const fromLabel = LABEL_ALIASES[trimmed.toLowerCase()];
  if (fromLabel) return fromLabel;
  const slug = noticeTypeSlug(trimmed);
  if (!slug) return "none";
  return NOTICE_TYPE_ALIASES[slug] ?? slug;
}

export function isActiveNotice(value: unknown): boolean {
  return parseNoticeType(value) !== "none";
}

function humanizeNoticeSlug(slug: string): string {
  const words = slug.replace(/_/g, " ").trim();
  if (!words) return "Notice";
  return words.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function noticeTypeLabel(value: unknown, options?: readonly NoticeTypeOption[]): string {
  const type = parseNoticeType(value);
  const fromOptions = options?.find((option) => option.value === type);
  if (fromOptions?.label) return fromOptions.label;
  if (type in SEED_NOTICE_LABELS) return SEED_NOTICE_LABELS[type as SeedNoticeType];
  return humanizeNoticeSlug(type);
}

export function noticeChipLabel(value: unknown, options?: readonly NoticeTypeOption[]): string | null {
  if (!isActiveNotice(value)) return null;
  return `Notice · ${noticeTypeLabel(value, options)}`;
}

function optionLabel(option: string | PicklistOption): string {
  if (typeof option === "string") return option.trim();
  return String(option.value ?? "").trim();
}

/** Picklist values become types. Missing/empty list falls back to seed types. */
export function noticeTypesFromPicklist(
  options?: readonly (string | PicklistOption)[] | null,
): NoticeTypeOption[] {
  const labels = (options ?? [])
    .map(optionLabel)
    .filter((label) => label && parseNoticeType(label) !== "none");
  const source = labels.length ? labels : [...DEAL_NOTICE_PICKLIST_OPTIONS];
  const seen = new Set<string>(["none"]);
  const next: NoticeTypeOption[] = [{ value: "none", label: SEED_NOTICE_LABELS.none }];
  for (const label of source) {
    const value = parseNoticeType(label);
    if (seen.has(value)) continue;
    seen.add(value);
    next.push({ value, label });
  }
  return next;
}

export function mergeNoticeTypeOptions(
  options: readonly NoticeTypeOption[],
  current?: unknown,
): NoticeTypeOption[] {
  const type = parseNoticeType(current);
  if (type === "none" || options.some((option) => option.value === type)) {
    return [...options];
  }
  return [...options, { value: type, label: noticeTypeLabel(type) }];
}

export function noticeTaskTitle(input: {
  noticeType: unknown;
  productLabel?: string | null;
  note?: string | null;
  options?: readonly NoticeTypeOption[];
}): string {
  const label = noticeTypeLabel(input.noticeType, input.options);
  const product = (input.productLabel ?? "").trim();
  const note = (input.note ?? "").trim();
  const base = product ? `Notice · ${label} · ${product}` : `Notice · ${label}`;
  return note ? `${base} — ${note}` : base;
}

export function noticeCompleteLogBody(input: {
  agent: string;
  noticeType: unknown;
  notes: string;
  options?: readonly NoticeTypeOption[];
}): string {
  const type = parseNoticeType(input.noticeType);
  const label = noticeTypeLabel(type, input.options);
  return [
    `Agent: ${input.agent.trim() || "Agent"}`,
    `Notice: ${label} (${type})`,
    `Notes: ${input.notes.trim()}`,
  ].join("\n");
}

export function noticeTaskKind(noticeType: unknown): string {
  return parseNoticeType(noticeType) === "inspection_before_bind"
    ? "inspection_scheduling"
    : "work_reminder";
}
