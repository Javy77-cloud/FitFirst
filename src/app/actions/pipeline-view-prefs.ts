"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parsePipelineView, parseRenewalsView, type PipelineViewId } from "@/lib/wire/pipeline";
import {
  PIPELINE_VIEW_COOKIE,
  RENEWALS_VIEW_COOKIE,
  type PipelineViewCookie,
} from "@/lib/wire/pipeline-view-cookies";

const COOKIE_OPTS = { path: "/", sameSite: "lax" as const };

function asPipelineViewId(raw: string | undefined | null): PipelineViewId | null {
  if (!raw) return null;
  if (raw === "board" || raw === "funnel" || raw === "grid" || raw === "list" || raw === "table") {
    return parsePipelineView(raw);
  }
  return null;
}

function cookieName(raw: string | null | undefined): PipelineViewCookie {
  return raw === RENEWALS_VIEW_COOKIE ? RENEWALS_VIEW_COOKIE : PIPELINE_VIEW_COOKIE;
}

/** Per-agent cookie default for Deals / Pipeline view (List | Grid | Board | Funnel). */
export async function readDefaultPipelineView(
  cookie: PipelineViewCookie = PIPELINE_VIEW_COOKIE,
): Promise<PipelineViewId | null> {
  const jar = await cookies();
  const parsed = asPipelineViewId(jar.get(cookie)?.value ?? null);
  if (!parsed) return null;
  return cookie === RENEWALS_VIEW_COOKIE ? parseRenewalsView(parsed) : parsed;
}

export async function readDefaultRenewalsView(): Promise<PipelineViewId | null> {
  return readDefaultPipelineView(RENEWALS_VIEW_COOKIE);
}

/**
 * Set or clear the per-agent default pipeline view cookie.
 * Empty / missing `view` clears the cookie (system fallback = list on deals, board on renewals).
 */
export async function saveDefaultPipelineViewAction(formData: FormData) {
  const raw = String(formData.get("view") ?? "").trim();
  const cookie = cookieName(String(formData.get("cookie") ?? ""));
  const jar = await cookies();
  const view = asPipelineViewId(raw);
  if (!view) {
    jar.delete(cookie);
  } else {
    jar.set(cookie, view, COOKIE_OPTS);
  }
  revalidatePath("/deals");
  revalidatePath("/renewals");
}
