import type { PipelineViewCookie } from "@/lib/wire/pipeline-view-cookies";

/** Hover tip and accessible name for every view-chip star. */
export const FAVORITE_VIEW_TOOLTIP = "Set as favorite.";

/**
 * Persist the chip that was starred.
 * The open view is not an input: starring List while Stack is open still saves List.
 */
export function favoriteViewFormData(clickedView: string, cookie: PipelineViewCookie): FormData {
  const data = new FormData();
  data.set("view", clickedView);
  data.set("cookie", cookie);
  return data;
}
