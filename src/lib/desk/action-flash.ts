/** Shared action-flash keys. sep7bf can hook these for top-center toasts. */
export const ACTION_FLASH = {
  sheetSaved: "sheet-saved",
} as const;

export const ACTION_FLASH_MESSAGE: Record<(typeof ACTION_FLASH)[keyof typeof ACTION_FLASH], string> = {
  "sheet-saved": "Sheet saved.",
};

export function dealActionFlashHref(input: {
  dealId: string;
  tab?: string;
  line?: string;
  product?: string;
  notice: string;
}) {
  const query = new URLSearchParams();
  if (input.tab) query.set("tab", input.tab);
  if (input.line) query.set("line", input.line);
  if (input.product) query.set("product", input.product);
  query.set("notice", input.notice);
  return `/deals/${input.dealId}?${query.toString()}`;
}

export function isActionFlash(notice: string | null | undefined, key: keyof typeof ACTION_FLASH) {
  return notice === ACTION_FLASH[key];
}
