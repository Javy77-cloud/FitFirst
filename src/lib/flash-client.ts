"use client";

import { FLASH_EVENT, resolveFlashMessage, type FlashKind } from "@/lib/flash";

/** Client-side confirmation when the mutation already stays on the page. */
export function flashAction(message: string, kind: FlashKind = "success") {
  const copy = resolveFlashMessage(message);
  if (!copy || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FLASH_EVENT, { detail: { message: copy, kind } }));
}
