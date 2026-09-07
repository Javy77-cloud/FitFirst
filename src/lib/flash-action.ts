import { redirect } from "next/navigation";
import { withFlash, type FlashKind } from "@/lib/flash";

/**
 * Stay-on-surface confirmation after a successful (or failed) mutation.
 * Lands on `href?flash=` so the shared ActionToast host can render it.
 */
export function flashAction(href: string, message: string, kind: FlashKind = "success"): never {
  redirect(withFlash(href, message, kind));
}
