/** Fit an agency mail body inside the reading pane. Never a horizontal scroller. */

const DROPPED_BLOCK =
  /<(script|style|iframe|object|embed|link|meta|form|svg|noscript|head)\b[^>]*>[\s\S]*?<\/\1>/gi;

export function looksLikeHtml(value: string | null | undefined): boolean {
  return /<\/?[a-z][^>]*>/i.test(value ?? "");
}

/** Drop scripts, event handlers, and fixed widths so a contract can wrap. */
export function sanitizeInboxHtml(raw: string | null | undefined): string {
  const source = (raw ?? "").trim();
  if (!source || !looksLikeHtml(source)) return "";
  let html = source.replace(/<!--[\s\S]*?-->/g, " ").replace(DROPPED_BLOCK, " ");
  html = html.replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
  html = html.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*data:(?!image\/)[\s\S]*?\2/gi, ' $1="#"');
  html = html.replace(/\s(href|src)\s*=\s*data:(?!image\/)[^\s>]+/gi, ' $1="#"');
  html = html.replace(/\ssrc\s*=\s*(['"])\s*cid:[^'"]*\1/gi, "");
  html = html.replace(/\sstyle\s*=\s*(['"])[\s\S]*?\1/gi, "");
  html = html.replace(/\s(width|height|min-width|nowrap)\s*=\s*(['"])[\s\S]*?\2/gi, "");
  html = html.replace(/\s(width|height)\s*=\s*[^\s>]+/gi, "");
  return html.trim();
}

/** Swap cid: sources for data:image URLs. Non-image data URLs are ignored. */
export function applyInboxInlineImages(
  html: string | null | undefined,
  images: { contentId: string; dataUrl: string }[],
): string {
  let next = html ?? "";
  if (!next) return "";
  for (const image of images) {
    const cid = image.contentId.replace(/^<|>$/g, "").trim();
    if (!cid || !image.dataUrl.startsWith("data:image/")) continue;
    const escaped = cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`cid:${escaped}`, "gi"), image.dataUrl);
  }
  return next;
}

/** Plain fallback when a message is HTML-only. Block tags become line breaks. */
export function plainFromInboxHtml(raw: string | null | undefined): string {
  const source = raw ?? "";
  if (!source.trim()) return "";
  return source
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote|section)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}
