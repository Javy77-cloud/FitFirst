import { describe, expect, it } from "vitest";
import {
  COPY_SHEET_HINT,
  COPY_SHEET_LABEL,
  EDIT_SHEET_LABEL,
  ENTER_DATA_LABEL,
  FILL_FROM_DOCS_LABEL,
  SEND_FIELD_SHEET_HINT,
  SEND_FIELD_SHEET_LABEL,
  editSheetLabel,
} from "./toolbar";

describe("quote sheet toolbar copy", () => {
  it("uses broker language, not Super-Copy / Forms jargon", () => {
    expect(FILL_FROM_DOCS_LABEL).toBe("Fill from source docs");
    expect(COPY_SHEET_LABEL).toBe("Copy Risk Profile");
    expect(SEND_FIELD_SHEET_LABEL).toBe("Send Risk Profile");
    expect(COPY_SHEET_HINT.toLowerCase()).toContain("clipboard");
    expect(SEND_FIELD_SHEET_HINT.toLowerCase()).toContain("fill");
    expect(FILL_FROM_DOCS_LABEL.toLowerCase()).not.toContain("super");
    expect(COPY_SHEET_LABEL.toLowerCase()).not.toContain("json");
    expect(SEND_FIELD_SHEET_LABEL.toLowerCase()).not.toContain("forms");
  });

  it("uses Enter data on a blank sheet and Edit when values exist", () => {
    expect(editSheetLabel(true)).toBe(ENTER_DATA_LABEL);
    expect(editSheetLabel(false)).toBe(EDIT_SHEET_LABEL);
  });
});
