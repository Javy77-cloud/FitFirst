"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  FLASH_DISMISS_MS,
  FLASH_EVENT,
  FLASH_KIND_PARAM,
  FLASH_PARAM,
  clearPersistedFlash,
  persistFlash,
  readPersistedFlash,
  resolveFlashMessage,
  type FlashKind,
} from "@/lib/flash";
import { cn } from "@/lib/utils";

type ToastState = {
  id: number;
  message: string;
  kind: FlashKind;
};

export function ActionToast({
  message,
  kind = "success",
  onClose,
}: {
  message: string;
  kind?: FlashKind;
  onClose?: () => void;
}) {
  return (
    <div
      role="status"
      data-testid="action-toast"
      data-ff-action-toast=""
      data-ff-flash-kind={kind}
      className={cn(
        "pointer-events-auto flex max-w-[min(32rem,calc(100vw-2rem))] items-start gap-3 rounded-md px-5 py-3 text-base font-semibold shadow-lg ring-1 ring-white/20",
        kind === "error" ? "bg-destructive text-white" : "bg-navy text-white",
      )}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 rounded-sm text-white/80 hover:text-white"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function ActionToastHost() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, kind: FlashKind) {
    persistFlash({ message, kind });
    setToast({ id: Date.now(), message, kind });
  }

  function dismissToast() {
    clearPersistedFlash();
    setToast(null);
  }

  // Restore after Suspense remount / replace — query may already be stripped.
  useEffect(() => {
    const stored = readPersistedFlash();
    if (!stored) return;
    setToast({ id: Date.now(), message: stored.message, kind: stored.kind });
  }, []);

  useEffect(() => {
    const message = resolveFlashMessage(searchParams.get(FLASH_PARAM));
    if (!message) return;
    const kind: FlashKind = searchParams.get(FLASH_KIND_PARAM) === "error" ? "error" : "success";
    // Persist before strip so a remount still has copy. Do not replace until after paint.
    showToast(message, kind);
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete(FLASH_PARAM);
        next.delete(FLASH_KIND_PARAM);
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        // Strip must not restore a stale RSC payload (deleted docs reappearing).
        router.refresh();
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [searchParams, pathname, router]);

  useEffect(() => {
    function onFlash(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; kind?: FlashKind }>).detail;
      const message = resolveFlashMessage(detail?.message);
      if (!message) return;
      showToast(message, detail?.kind === "error" ? "error" : "success");
    }
    window.addEventListener(FLASH_EVENT, onFlash);
    return () => window.removeEventListener(FLASH_EVENT, onFlash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const hide = window.setTimeout(dismissToast, FLASH_DISMISS_MS);
    return () => window.clearTimeout(hide);
  }, [toast]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
      data-ff-action-toast-host=""
      data-testid="action-toast-host"
    >
      {toast ? (
        <ActionToast
          key={toast.id}
          message={toast.message}
          kind={toast.kind}
          onClose={dismissToast}
        />
      ) : null}
    </div>
  );
}
