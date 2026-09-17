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

export const NOTICE_FAMILY_PICKLIST_NAMES = {
  pc: ["Deal notices · P&C", "Deal notices"],
  life: ["Deal notices · Life"],
  health: ["Deal notices · Health"],
} as const;

export function noticePicklistNamesForFamily(family: "pc" | "life" | "health"): readonly string[] {
  return NOTICE_FAMILY_PICKLIST_NAMES[family];
}

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

/** Old Inspection dropdown leftovers — not a real Set notice. */
const LEGACY_MINI_NOTICE = new Set(["inspection", "pending_inspection"]);

export function isLegacyMiniNotice(value: unknown): boolean {
  if (typeof value !== "string") return !value;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return LEGACY_MINI_NOTICE.has(noticeTypeSlug(trimmed));
}

/** Compact chip beside the stage — hide empty / leftover Inspection crumbs. */
export function isRenderableNoticeStamp(value: unknown): boolean {
  if (!isActiveNotice(value) || isLegacyMiniNotice(value)) return false;
  return Boolean(noticeStampPhrase(value));
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

/** Stamp beside Bound / Policy issued — shorter seed words, custom types as-is. */
const NOTICE_STAMP_SHORT: Record<string, string> = {
  inspection_before_bind: "Inspection",
  check_mortgagee_payment: "Check mortgagee",
};

export function noticeStampPhrase(
  value: unknown,
  options?: readonly NoticeTypeOption[],
): string | null {
  if (!isActiveNotice(value)) return null;
  const type = parseNoticeType(value);
  const short = NOTICE_STAMP_SHORT[type];
  return `Notice · ${short ?? noticeTypeLabel(type, options)}`;
}

const NOTICE_FAMILY_SEED_KEYS = {
  pc: ["deal_notices_pc", "deal_notices"],
  life: ["deal_notices_life"],
  health: ["deal_notices_health"],
} as const;

export function noticePicklistForFamily(
  lists: readonly {
    id?: string;
    name: string;
    seedKey?: string | null;
    options?: readonly (string | PicklistOption)[] | null;
  }[],
  family: "pc" | "life" | "health",
): { id: string; name: string; options: readonly (string | PicklistOption)[] } | null {
  const seedKeys = new Set<string>(NOTICE_FAMILY_SEED_KEYS[family]);
  const bySeed = lists.find((row) => row.seedKey && seedKeys.has(row.seedKey));
  if (bySeed?.id) {
    return { id: bySeed.id, name: bySeed.name, options: bySeed.options ?? [] };
  }
  const names = noticePicklistNamesForFamily(family).map((name) => name.toLowerCase());
  for (const name of names) {
    const list = lists.find((row) => row.name.trim().toLowerCase() === name);
    if (list?.id) {
      return { id: list.id, name: list.name, options: list.options ?? [] };
    }
  }
  return null;
}

export function noticeFamilyLabel(family: "pc" | "life" | "health"): string {
  if (family === "life") return "Life";
  if (family === "health") return "Health";
  return "P&C";
}

function optionLabel(option: string | PicklistOption): string {
  if (typeof option === "string") return option.trim();
  return String(option.value ?? "").trim();
}

/** Picklist values become types. Empty Life/Health lists stay None-only (no PC fallback). */
export function noticeTypesFromPicklist(
  options?: readonly (string | PicklistOption)[] | null,
  fallback: readonly string[] = DEAL_NOTICE_PICKLIST_OPTIONS,
): NoticeTypeOption[] {
  const labels = (options ?? [])
    .map(optionLabel)
    .filter((label) => label && parseNoticeType(label) !== "none");
  const source = labels.length ? labels : [...fallback];
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

export function noticeTypesForFamily(
  lists: readonly { name: string; options?: readonly (string | PicklistOption)[] | null }[],
  family: "pc" | "life" | "health",
): NoticeTypeOption[] {
  const names = noticePicklistNamesForFamily(family).map((name) => name.toLowerCase());
  const list = lists.find((row) => names.includes(row.name.trim().toLowerCase()));
  return noticeTypesFromPicklist(list?.options, family === "pc" ? DEAL_NOTICE_PICKLIST_OPTIONS : []);
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

export function noticeDeleteLogBody(input: {
  agent: string;
  noticeType: unknown;
  options?: readonly NoticeTypeOption[];
}): string {
  const type = parseNoticeType(input.noticeType);
  const label = noticeTypeLabel(type, input.options);
  return [
    `Agent: ${input.agent.trim() || "Agent"}`,
    `Notice: ${label} (${type})`,
    "Removed as never needed (not completed).",
  ].join("\n");
}

/** Confirm copy: Delete ≠ Complete. */
export function noticeDeleteConfirmMessage(noticeLabel?: string): string {
  const label = (noticeLabel ?? "").trim() || "this notice";
  return [
    `Delete ${label}?`,
    "",
    "Delete removes this flag as if it was never needed. It does not mark the work complete.",
    "",
    "Complete = you finished the work. Delete = this notice should not have been here.",
    "",
    "Any reminder task linked to this notice will be cancelled.",
  ].join("\n");
}

export function confirmDeleteDealNotice(noticeLabel?: string): boolean {
  const ask = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!ask) return false;
  return ask(noticeDeleteConfirmMessage(noticeLabel));
}

export function noticeTaskKind(noticeType: unknown): string {
  return parseNoticeType(noticeType) === "inspection_before_bind"
    ? "inspection_scheduling"
    : "work_reminder";
}

/** Desk task titles created for a notice — used to offer clear-on-complete. */
export function isNoticeTaskTitle(title: unknown): boolean {
  return typeof title === "string" && title.trim().startsWith("Notice ·");
}
