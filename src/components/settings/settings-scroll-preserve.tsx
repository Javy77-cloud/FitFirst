"use client";

import { useLayoutEffect, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  flashScrollAnchorFromSubmit,
  lockFlashScroll,
  persistFlashScroll,
  readFlashScroll,
  shouldRestoreFlashScroll,
} from "@/lib/flash-scroll";

/**
 * Settings saves often `redirect(?flash=)` / `?notice=` / `router.refresh()`.
 * Capture the viewport on submit and lock it until Next.js finishes remounting.
 */
export function SettingsScrollPreserve({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
    const saved = readFlashScroll();
    if (!shouldRestoreFlashScroll(saved, pathname) || !saved) return;
    const stop = lockFlashScroll(saved);
    return stop;
  }, [pathname, searchParams]);

  useEffect(() => {
    const saved = readFlashScroll();
    if (!shouldRestoreFlashScroll(saved, pathname) || !saved) return;
    return lockFlashScroll(saved);
  }, [pathname, searchParams]);

  return (
    <div
      data-ff-settings-scroll=""
      onSubmitCapture={(event) => {
        persistFlashScroll({
          pathname,
          anchor: flashScrollAnchorFromSubmit(event.target),
        });
      }}
    >
      {children}
    </div>
  );
}
