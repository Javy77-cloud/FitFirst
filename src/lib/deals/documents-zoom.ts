export const DOCS_ZOOM_STORAGE_KEY = "ff-docs-zoom";
export const DOCS_ZOOM_DEFAULT = "fit" as const;

export type DocsZoomMode = "fit" | "100";

/** PDF-viewer style: default fit-to-screen so the tab content stays in view. */
export function parseDocsZoomMode(raw: string | null | undefined): DocsZoomMode {
  return raw === "100" ? "100" : "fit";
}

export function documentsFitScale(
  contentWidth: number,
  contentHeight: number,
  availWidth: number,
  availHeight: number,
): number {
  if (contentWidth <= 0 || contentHeight <= 0 || availWidth <= 0 || availHeight <= 0) {
    return 1;
  }
  const scale = Math.min(1, availWidth / contentWidth, availHeight / contentHeight);
  return Number.isFinite(scale) && scale > 0 ? Math.max(0.2, scale) : 1;
}
