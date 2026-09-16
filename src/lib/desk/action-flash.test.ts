import { describe, expect, it } from "vitest";
import {
  ACTION_FLASH,
  ACTION_FLASH_MESSAGE,
  SHEET_CONFIRM_HASH,
  dealActionFlashHref,
  isActionFlash,
} from "./action-flash";

describe("action flash helper", () => {
  it("builds a deal redirect flash for a saved sheet", () => {
    expect(ACTION_FLASH.sheetSaved).toBe("sheet-saved");
    expect(ACTION_FLASH_MESSAGE["sheet-saved"]).toBe("Sheet saved.");
    expect(isActionFlash("sheet-saved", "sheetSaved")).toBe(true);
    expect(isActionFlash("nope", "sheetSaved")).toBe(false);
    expect(dealActionFlashHref({ dealId: "d1", tab: "documents", line: "home", notice: ACTION_FLASH.sheetSaved })).toBe(
      "/deals/d1?tab=documents&line=home&notice=sheet-saved",
    );
    expect(
      dealActionFlashHref({
        dealId: "d1",
        tab: "documents",
        line: "home",
        notice: ACTION_FLASH.sheetSaved,
        hash: SHEET_CONFIRM_HASH,
      }),
    ).toBe("/deals/d1?tab=documents&line=home&notice=sheet-saved#ff-sheet-confirm");
  });
});
