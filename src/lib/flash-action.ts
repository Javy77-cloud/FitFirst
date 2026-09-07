import { redirect } from "next/navigation";
import { withFlash, type FlashKind } from "@/lib/flash";

/**
 * Stay-on-surface confirmation after a successful (or failed) mutation.
 * Lands on `href?flash=` so the shared ActionToast host can render it.
 */
export function flashAction(href: string, message: string, kind: FlashKind = "success"): never {
  redirect(withFlash(href, message, kind));
}

/** Prefer an in-form `next` / `returnTo` path; otherwise stay on `fallback`. */
export function flashStay(
  formData: FormData,
  fallback: string,
  message: string,
  kind: FlashKind = "success",
): never {
  const next = String(formData.get("next") ?? formData.get("returnTo") ?? "").trim();
  const href = next.startsWith("/") && !next.startsWith("//") ? next : fallback;
  flashAction(href, message, kind);
}
