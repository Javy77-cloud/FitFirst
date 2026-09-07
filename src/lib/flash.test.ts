import { describe, expect, it } from "vitest";
import {
  FLASH_COPY,
  FLASH_KIND_PARAM,
  FLASH_PARAM,
  resolveFlashMessage,
  stripFlash,
  withFlash,
} from "@/lib/flash";

describe("flash helper", () => {
  it("resolves known keys to confirmation copy", () => {
    expect(resolveFlashMessage("deal-details-saved")).toBe("Deal details saved");
    expect(resolveFlashMessage("sheet-saved")).toBe("Sheet saved");
    expect(resolveFlashMessage("tag-added")).toBe("Tag added");
    expect(resolveFlashMessage("document-deleted")).toBe("Document deleted");
    expect(FLASH_COPY["deal-details-saved"]).toBe("Deal details saved");
  });

  it("accepts a short raw phrase and ignores blanks", () => {
    expect(resolveFlashMessage("Contact updated")).toBe("Contact updated");
    expect(resolveFlashMessage("Deal+details+saved")).toBe("Deal details saved");
    expect(resolveFlashMessage("")).toBeNull();
    expect(resolveFlashMessage("   ")).toBeNull();
    expect(resolveFlashMessage(null)).toBeNull();
  });

  it("appends ?flash= without dropping the existing tab or hash", () => {
    expect(withFlash("/deals/abc?tab=documents", "sheet-saved")).toBe(
      "/deals/abc?tab=documents&flash=sheet-saved",
    );
    expect(withFlash("/deals/abc#sheet", "sheet-saved")).toBe("/deals/abc?flash=sheet-saved#sheet");
    expect(withFlash("/deals/abc", "Could not save", "error")).toBe(
      `/deals/abc?${FLASH_PARAM}=Could+not+save&${FLASH_KIND_PARAM}=error`,
    );
  });

  it("strips flash params so a refresh does not replay the toast", () => {
    expect(stripFlash("/deals/abc?tab=documents&flash=sheet-saved&flashKind=error")).toBe(
      "/deals/abc?tab=documents",
    );
    expect(stripFlash("/deals/abc?flash=sheet-saved")).toBe("/deals/abc");
  });
});
