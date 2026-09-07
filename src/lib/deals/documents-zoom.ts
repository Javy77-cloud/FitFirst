/** Javy reversed fit-zoom. Documents stay locked at 100% with no toggle. */
export const DOCS_ZOOM_LOCKED = "100" as const;
export const DOCS_ZOOM_DEFAULT = DOCS_ZOOM_LOCKED;
export const DOCS_ZOOM_STORAGE_KEY = "ff-docs-zoom";

export type DocsZoomMode = typeof DOCS_ZOOM_LOCKED;

export function parseDocsZoomMode(_raw?: string | null): DocsZoomMode {
  return DOCS_ZOOM_LOCKED;
}
