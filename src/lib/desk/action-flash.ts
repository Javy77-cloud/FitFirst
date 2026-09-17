/** Shared action-flash keys. sep7bf can hook these for top-center toasts. */
export const ACTION_FLASH = {
  sheetSaved: "sheet-saved",
} as const;

/** Keep Save Risk Profile at the Confirm gate — do not jump the page to the top. */
export const SHEET_CONFIRM_HASH = "ff-sheet-confirm";

export const ACTION_FLASH_MESSAGE: Record<(typeof ACTION_FLASH)[keyof typeof ACTION_FLASH], string> = {
  "sheet-saved": "Risk Profile saved.",
};

export function dealActionFlashHref(input: {
  dealId: string;
  tab?: string;
  line?: string;
  product?: string;
  notice: string;
  hash?: string;
}) {
  const query = new URLSearchParams();
  if (input.tab) query.set("tab", input.tab);
  if (input.line) query.set("line", input.line);
  if (input.product) query.set("product", input.product);
  query.set("notice", input.notice);
  const hash = input.hash?.replace(/^#/, "").trim();
  return `/deals/${input.dealId}?${query.toString()}${hash ? `#${hash}` : ""}`;
}

export function isActionFlash(notice: string | null | undefined, key: keyof typeof ACTION_FLASH) {
  return notice === ACTION_FLASH[key];
}
