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
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** Shrink until both axes fit. No floor — a long sheet must go below 20% if needed. */
export function documentsZeroScrollScale(
  contentWidth: number,
  contentHeight: number,
  availWidth: number,
  availHeight: number,
): number {
  let scale = documentsFitScale(contentWidth, contentHeight, availWidth, availHeight);
  let guard = 0;
  while (
    guard < 48 &&
    (contentWidth * scale > availWidth + 0.5 || contentHeight * scale > availHeight + 0.5)
  ) {
    scale *= 0.97;
    guard += 1;
  }
  return scale > 0 ? scale : 1;
}

export function documentsFitOverflows(
  contentWidth: number,
  contentHeight: number,
  scale: number,
  availWidth: number,
  availHeight: number,
): boolean {
  return contentWidth * scale > availWidth + 0.5 || contentHeight * scale > availHeight + 0.5;
}
