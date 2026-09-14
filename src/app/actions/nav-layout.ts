"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { defaultStoredNavLayout, normalizeNavLayout, type StoredNavLayout } from "@/lib/desk/nav-layout";
import { upsertStoredNavLayout } from "@/lib/db/nav-prefs";

function refreshNav() {
  revalidatePath("/", "layout");
}

export async function saveNavLayoutAction(
  layout: StoredNavLayout,
): Promise<{ ok: true; layout: StoredNavLayout } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) {
    return { ok: false, error: "Sign in to save your menu." };
  }
  const opts = { isAdmin: session.isAdmin };
  const saved = await upsertStoredNavLayout(session.userId, normalizeNavLayout(layout, opts), opts);
  refreshNav();
  return { ok: true, layout: saved };
}

export async function resetNavLayoutAction(): Promise<
  { ok: true; layout: StoredNavLayout } | { ok: false; error: string }
> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) {
    return { ok: false, error: "Sign in to reset your menu." };
  }
  const opts = { isAdmin: session.isAdmin };
  await upsertStoredNavLayout(session.userId, null, opts);
  refreshNav();
  return { ok: true, layout: defaultStoredNavLayout(opts) };
}

export async function savePersonalPrefsAction(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) {
    return;
  }
  const opts = { isAdmin: session.isAdmin };
  const current = await (await import("@/lib/db/nav-prefs")).getStoredNavLayout(session.userId, opts);
  const timezone = String(formData.get("timezone") ?? "").trim();
  const emailSignature = String(formData.get("emailSignature") ?? "");
  const notifyInApp = formData.get("notifyInApp") === "true" || formData.get("notifyInApp") === "on";
  const dateFormat = String(formData.get("dateFormat") ?? "").trim();
  const next = {
    ...current,
    personal: {
      timezone: timezone || undefined,
      emailSignature,
      notifyInApp,
      dateFormat: dateFormat || undefined,
    },
  };
  await upsertStoredNavLayout(session.userId, next, opts);
  refreshNav();
  const { flashAction } = await import("@/lib/flash-action");
  flashAction("/me", "settings-saved");
}
