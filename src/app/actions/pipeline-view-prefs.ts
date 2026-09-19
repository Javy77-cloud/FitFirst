"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseDealsView, type DealsViewId } from "@/lib/deals/deals-views";
import {
  parsePipelineView,
  parseRenewalsView,
  type PipelineViewId,
  type RenewalsViewId,
} from "@/lib/wire/pipeline";
import {
  PIPELINE_VIEW_COOKIE,
  RENEWALS_VIEW_COOKIE,
  type PipelineViewCookie,
} from "@/lib/wire/pipeline-view-cookies";

const COOKIE_OPTS = { path: "/", sameSite: "lax" as const };

function asPipelineViewId(raw: string | undefined | null): PipelineViewId | DealsViewId | RenewalsViewId | null {
  if (!raw) return null;
  if (raw === "stack" || raw === "radar") return raw;
  if (raw === "board" || raw === "funnel" || raw === "grid" || raw === "list" || raw === "table") {
    return parsePipelineView(raw);
  }
  return null;
}

function cookieName(raw: string | null | undefined): PipelineViewCookie {
  return raw === RENEWALS_VIEW_COOKIE ? RENEWALS_VIEW_COOKIE : PIPELINE_VIEW_COOKIE;
}

/** Per-agent cookie default for Deals (Stack | Radar) or Renewals (Board | Stack). */
export async function readDefaultPipelineView(
  cookie: PipelineViewCookie = PIPELINE_VIEW_COOKIE,
): Promise<PipelineViewId | DealsViewId | RenewalsViewId | null> {
  const jar = await cookies();
  const parsed = asPipelineViewId(jar.get(cookie)?.value ?? null);
  if (!parsed) return null;
  if (cookie === RENEWALS_VIEW_COOKIE) return parseRenewalsView(parsed);
  return parseDealsView(parsed);
}

export async function readDefaultRenewalsView(): Promise<RenewalsViewId | null> {
  const jar = await cookies();
  const parsed = asPipelineViewId(jar.get(RENEWALS_VIEW_COOKIE)?.value ?? null);
  if (!parsed) return null;
  return parseRenewalsView(parsed);
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
