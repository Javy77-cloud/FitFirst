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
