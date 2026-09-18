import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  FLASH_SCROLL_KEY,
  persistFlashScroll,
  readFlashScroll,
  shouldRestoreFlashScroll,
} from "./flash-scroll";

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
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { scrollY: 640 },
  });
  return store;
}

describe("flash scroll restore", () => {
  it("restores only the same settings path after a recent save", () => {
    mockSessionStorage();
    persistFlashScroll({ pathname: "/settings/esign", y: 640, anchor: "docusign" });
    expect(sessionStorage.getItem(FLASH_SCROLL_KEY)).toContain("docusign");
    const saved = readFlashScroll();
    expect(saved).toMatchObject({ pathname: "/settings/esign", y: 640, anchor: "docusign" });
    expect(shouldRestoreFlashScroll(saved, "/settings/esign")).toBe(true);
    expect(shouldRestoreFlashScroll(saved, "/settings/integrations")).toBe(false);
    expect(shouldRestoreFlashScroll(saved, "/settings/esign", Date.now() + 20_000)).toBe(false);
    expect(readFileSync("src/components/settings/settings-shell.tsx", "utf8")).toMatch(
      /SettingsScrollPreserve/,
    );
    expect(readFileSync("src/lib/flash-action.ts", "utf8")).toMatch(/isSamePageHref/);
  });
});

afterEach(() => {
  try {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    delete (globalThis as { window?: Window }).window;
  } catch {
    // ignore
  }
});
