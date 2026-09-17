import type { FlashKind } from "@/lib/flash";

/** Collapsed list cards show this many values so agents can see what is inside. */
export const LIST_PREVIEW_COUNT = 4;

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
