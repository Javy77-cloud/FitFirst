/** Broker-facing Quote Sheet toolbar. No Super-Copy / Forms jargon. */

export const FILL_FROM_DOCS_LABEL = "Fill from source docs";
export const FILL_FROM_DOCS_HINT =
  "Reads an uploaded dec, 4-point, or wind mit into blank yellow fields. Leaves what you typed alone.";

export const COPY_SHEET_LABEL = "Copy Risk Profile";
export const COPY_SHEET_HINT =
  "Copies a labeled packet to your clipboard so you can paste into a carrier portal.";

export const SEND_FIELD_SHEET_LABEL = "Send Risk Profile";
export const SEND_FIELD_SHEET_HINT =
  "Shares this Risk Profile with Fill (clipboard + browser storage). Not a PDF and not email.";

export const EDIT_SHEET_LABEL = "Edit";
export const ENTER_DATA_LABEL = "Enter data";
export const SAVE_SHEET_LABEL = "Save Risk Profile";
export const CANCEL_EDIT_LABEL = "Cancel";

export function editSheetLabel(blankSheet: boolean): string {
  return blankSheet ? ENTER_DATA_LABEL : EDIT_SHEET_LABEL;
}
