import { afterEach, describe, expect, it } from "vitest";
import {
  FLASH_COPY,
  FLASH_KIND_PARAM,
  FLASH_PARAM,
  FLASH_STORAGE_KEY,
  clearPersistedFlash,
  dealDetailsSavedHref,
  quotesRequestedHref,
  persistFlash,
  readPersistedFlash,
  resolveFlashMessage,
  stripFlash,
  withFlash,
} from "@/lib/flash";

function mockSessionStorage() {
  const data = new Map<string, string>();
  const store: Storage = {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: store });
  return store;
}

describe("flash helper", () => {
  it("resolves known keys to confirmation copy", () => {
    expect(resolveFlashMessage("deal-details-saved")).toBe("Deal details saved");
    expect(resolveFlashMessage("layout-saved")).toBe("Deal layout saved");
    expect(resolveFlashMessage("home-layout-saved")).toBe("Layout saved");
    expect(resolveFlashMessage("settings-saved")).toBe("Settings saved");
    expect(resolveFlashMessage("sheet-saved")).toBe("Sheet saved");
    expect(resolveFlashMessage("tag-added")).toBe("Tag added");
    expect(resolveFlashMessage("tag-created")).toBe("Tag created");
    expect(resolveFlashMessage("document-deleted")).toBe("Document deleted");
    expect(resolveFlashMessage("documents-saved")).toBe("Documents saved");
    expect(FLASH_COPY["documents-saved"]).toBe("Documents saved");
    expect(FLASH_COPY["deal-details-saved"]).toBe("Deal details saved");
    expect(FLASH_COPY["layout-saved"]).toBe("Deal layout saved");
    expect(FLASH_COPY["lead-saved"]).toBe("Lead saved");
    expect(FLASH_COPY["policy-saved"]).toBe("Policy saved");
    expect(FLASH_COPY["meeting-saved"]).toBe("Meeting saved");
    expect(FLASH_COPY["outcome-saved"]).toBe("Outcome saved");
    expect(FLASH_COPY["consent-saved"]).toBe("Consent saved");
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

  it("lands Save Deal Details on the details tab and keeps line/product", () => {
    expect(dealDetailsSavedHref("abc")).toBe("/deals/abc?tab=details");
    expect(dealDetailsSavedHref("abc", { line: "HO" })).toBe("/deals/abc?tab=details&line=HO");
    expect(dealDetailsSavedHref("abc", { line: "HO", product: "HO3" })).toBe(
      "/deals/abc?tab=details&line=HO&product=HO3",
    );
    expect(dealDetailsSavedHref("abc", { line: "  ", product: null })).toBe("/deals/abc?tab=details");
    expect(withFlash(dealDetailsSavedHref("d1", { line: "home" }), "deal-details-saved")).toBe(
      "/deals/d1?tab=details&line=home&flash=deal-details-saved",
    );
    expect(quotesRequestedHref("abc")).toBe("/deals/abc?tab=quotes");
    expect(quotesRequestedHref("abc", { line: "home", product: "homeowners" })).toBe(
      "/deals/abc?tab=quotes&line=home&product=homeowners",
    );
    expect(withFlash(quotesRequestedHref("d1", { line: "home" }), "quotes-requested")).toBe(
      "/deals/d1?tab=quotes&line=home&flash=quotes-requested",
    );
  });

  it("keeps flash copy in sessionStorage across a remount after the query is stripped", () => {
    mockSessionStorage();
    persistFlash({ message: "Deal details saved", kind: "success" });
    expect(sessionStorage.getItem(FLASH_STORAGE_KEY)).toContain("Deal details saved");
    // Simulate remount: in-memory toast is gone, query is already stripped.
    const restored = readPersistedFlash();
    expect(restored).toEqual({ message: "Deal details saved", kind: "success" });
    persistFlash({ message: "Sheet saved", kind: "success" });
    expect(readPersistedFlash()).toEqual({ message: "Sheet saved", kind: "success" });
    clearPersistedFlash();
    expect(readPersistedFlash()).toBeNull();
  });
});

afterEach(() => {
  try {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  } catch {
    // ignore
  }
});
