import type { FlashKind } from "@/lib/flash";

/** Collapsed list cards show this many values so agents can see what is inside. */
export const LIST_PREVIEW_COUNT = 4;

/** Parent persist wait if a list editor must auto-save. Prefer blur + explicit Save. */
export const LIST_OPTION_COMMIT_MS = 300;

/**
 * Stable row identity for option inputs. Never include the live label — that remounts
 * the field on every letter and makes typing feel like one character per second.
 */
export function listOptionRowKey(scope: string, index: number): string {
  return `${scope}:${index}`;
}

export function listOptionNeedsCommit(committed: string, draft: string): boolean {
  return draft !== committed;
}

/**
 * Identities for one option row while the agent types. Must stay one key and must
 * never embed the live draft — that is the remount that made Production feel like
 * ~1s per character after PR #102.
 */
export function listOptionIdentitiesDuringTyping(
  scope: string,
  index: number,
  drafts: readonly string[],
): string[] {
  return drafts.map(() => listOptionRowKey(scope, index));
}

export function listOptionTypingRemounts(
  scope: string,
  index: number,
  drafts: readonly string[],
): boolean {
  const identities = listOptionIdentitiesDuringTyping(scope, index, drafts);
  if (identities.length === 0) return false;
  if (new Set(identities).size !== 1) return true;
  const identity = identities[0]!;
  return drafts.some(
    (draft) => identity === draft || identity === `${index}-${draft}` || identity === `${scope}:${index}:${draft}`,
  );
}

export type ListPersistField = {
  name: string;
  value: string;
};

/** Hidden fields for options past the preview so Save still sees A–Z order. */
export function collapsedPicklistPersistFields(
  options: readonly { value: string; color?: string | null }[],
  defaultIndex = -1,
  previewCount = LIST_PREVIEW_COUNT,
): ListPersistField[] {
  const fields: ListPersistField[] = [];
  for (let index = previewCount; index < options.length; index++) {
    const option = options[index]!;
    fields.push({ name: "options", value: option.value });
    fields.push({ name: "optionColors", value: option.color ?? "" });
    if (defaultIndex === index) fields.push({ name: "defaultIndex", value: String(index) });
  }
  return fields;
}

export function collapsedGlobalListPersistFields(
  rows: readonly { id: string; label: string; color?: string | null; family?: string | null }[],
  previewCount = LIST_PREVIEW_COUNT,
): ListPersistField[] {
  const fields: ListPersistField[] = [];
  for (const row of rows.slice(previewCount)) {
    fields.push({ name: "ids", value: row.id });
    fields.push({ name: "labels", value: row.label });
    fields.push({ name: "itemColors", value: row.color ?? "" });
    fields.push({ name: "families", value: row.family ?? "" });
  }
  return fields;
}

/** `FormData.getAll` order: visible rows, then collapsed persist, then empty add-row. */
export function listSaveValues(
  visible: readonly string[],
  collapsed: readonly string[],
  extra: readonly string[] = [],
): string[] {
  return [...visible, ...collapsed, ...extra].filter((value) => value.trim());
}

export type ListMutationResult = {
  ok: boolean;
  message: string;
  kind?: FlashKind;
};

export function listMutationOk(message: string): ListMutationResult {
  return { ok: true, message, kind: "success" };
}

export function listMutationError(message: string): ListMutationResult {
  return { ok: false, message, kind: "error" };
}

export function visibleListItems<T>(items: T[], expanded: boolean, previewCount = LIST_PREVIEW_COUNT): T[] {
  if (expanded || items.length <= previewCount) return items;
  return items.slice(0, previewCount);
}
