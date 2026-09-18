import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  encodeFlashCookie,
  FLASH_COOKIE,
  withFlash,
  type FlashKind,
} from "@/lib/flash";
import { isSamePageHref, requestPathname } from "@/lib/flash-path";

/**
 * Stay-on-surface confirmation after a successful (or failed) mutation.
 * Lands on `href?flash=` so the shared ActionToast host can render it.
 * Always navigates — do not put another flashAction after this call.
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

/** Cookie toast + RSC refresh. No redirect, so the viewport does not jump. */
export async function flashInPlace(message: string, kind: FlashKind = "success"): Promise<void> {
  const jar = await cookies();
  jar.set(FLASH_COOKIE, encodeFlashCookie(message, kind), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}

/**
 * Same-page Settings (and other in-place) saves must not `redirect(?flash=)`.
 * That navigation is what scrolls every Settings card back to the top.
 */
export async function flashSettings(
  href: string,
  message: string,
  kind: FlashKind = "success",
): Promise<void> {
  const headerList = await headers();
  const current = requestPathname(headerList);
  if (isSamePageHref(current, href)) {
    await flashInPlace(message, kind);
    return;
  }
  flashAction(href, message, kind);
}
