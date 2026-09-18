export const FLASH_SCROLL_KEY = "ff-flash-scroll";
export const FLASH_SCROLL_LOCK_MS = 900;
export const FLASH_SCROLL_MAX_AGE_MS = 15_000;

export type FlashScrollState = {
  pathname: string;
  y: number;
  anchor: string | null;
  at: number;
};

function browserStorage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function currentScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export function flashScrollAnchorFromSubmit(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLFormElement)) return null;
  const scoped = target.closest("[id]");
  const id = scoped?.id?.trim() || target.id?.trim() || "";
  if (!id) return null;
  if (id.startsWith("radix-") || id.startsWith("base-ui-")) return null;
  return id;
}

export function persistFlashScroll(input: {
  pathname: string;
  y?: number;
  anchor?: string | null;
}): FlashScrollState | null {
  if (typeof window === "undefined") return null;
  const state: FlashScrollState = {
    pathname: input.pathname,
    y: input.y ?? currentScrollY(),
    anchor: input.anchor ?? null,
    at: Date.now(),
  };
  const store = browserStorage();
  if (!store) return state;
  try {
    store.setItem(FLASH_SCROLL_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — in-memory lock still runs on this tick
  }
  return state;
}

export function readFlashScroll(): FlashScrollState | null {
  const store = browserStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(FLASH_SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FlashScrollState>;
    if (typeof parsed.pathname !== "string" || !parsed.pathname.startsWith("/")) return null;
    if (typeof parsed.y !== "number" || !Number.isFinite(parsed.y)) return null;
    if (typeof parsed.at !== "number" || !Number.isFinite(parsed.at)) return null;
    return {
      pathname: parsed.pathname,
      y: parsed.y,
      anchor: typeof parsed.anchor === "string" && parsed.anchor ? parsed.anchor : null,
      at: parsed.at,
    };
  } catch {
    return null;
  }
}

export function clearFlashScroll(): void {
  const store = browserStorage();
  if (!store) return;
  try {
    store.removeItem(FLASH_SCROLL_KEY);
  } catch {
    // ignore
  }
}

export function shouldRestoreFlashScroll(
  saved: FlashScrollState | null,
  pathname: string,
  now = Date.now(),
  maxAgeMs = FLASH_SCROLL_MAX_AGE_MS,
): boolean {
  if (!saved) return false;
  if (saved.pathname !== pathname) return false;
  if (now - saved.at > maxAgeMs) return false;
  return true;
}

export function applyFlashScroll(saved: FlashScrollState): void {
  if (typeof window === "undefined") return;
  const y = Math.max(0, saved.y);
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
  if (!saved.anchor) return;
  const el = document.getElementById(saved.anchor);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const inView = rect.bottom > 64 && rect.top < viewport - 48;
  if (!inView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Re-apply scroll while Next.js finishes redirect / replace / refresh. */
export function lockFlashScroll(saved: FlashScrollState, ms = FLASH_SCROLL_LOCK_MS): () => void {
  if (typeof window === "undefined") return () => {};
  const end = Date.now() + ms;
  const tick = () => {
    if (Date.now() > end) return;
    if (Math.abs(currentScrollY() - saved.y) > 2) applyFlashScroll(saved);
  };
  applyFlashScroll(saved);
  const interval = window.setInterval(tick, 32);
  const onScroll = () => {
    if (Date.now() > end) return;
    if (currentScrollY() + 8 < saved.y) applyFlashScroll(saved);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const timeout = window.setTimeout(() => stop(), ms);
  function stop() {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    window.removeEventListener("scroll", onScroll);
  }
  return stop;
}
