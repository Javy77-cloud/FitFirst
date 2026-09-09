"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parsePipelineView, type PipelineViewId } from "@/lib/wire/pipeline";

const COOKIE = "ff_pipeline_view";
const COOKIE_OPTS = { path: "/", sameSite: "lax" as const };

function asPipelineViewId(raw: string | undefined | null): PipelineViewId | null {
  if (!raw) return null;
  if (raw === "board" || raw === "funnel" || raw === "grid" || raw === "list" || raw === "table") {
    return parsePipelineView(raw);
  }
  return null;
}

/** Per-agent cookie default for Deals / Pipeline view (List | Grid | Board | Funnel). */
export async function readDefaultPipelineView(): Promise<PipelineViewId | null> {
  const jar = await cookies();
  return asPipelineViewId(jar.get(COOKIE)?.value ?? null);
}

/**
 * Set or clear the per-agent default pipeline view cookie.
 * Empty / missing `view` clears the cookie (system fallback = list).
 */
export async function saveDefaultPipelineViewAction(formData: FormData) {
  const raw = String(formData.get("view") ?? "").trim();
  const jar = await cookies();
  const view = asPipelineViewId(raw);
  if (!view) {
    jar.delete(COOKIE);
  } else {
    jar.set(COOKIE, view, COOKIE_OPTS);
  }
  revalidatePath("/deals");
}
