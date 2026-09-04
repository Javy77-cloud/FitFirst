const HTTP_URL = /^https?:\/\/[^\s]+$/i;

/** Paste-only video proposal URL. No Loom API, no file upload of the video itself. */
export function normalizeVideoProposalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (!HTTP_URL.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function videoProposalHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
