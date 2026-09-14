"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { splitPipeList } from "@/lib/appetite/gate/lines";
import { saveAppetiteFlHoOrder, updateAppetiteRules } from "@/lib/appetite/gate/store";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function list(form: FormData, key: string): string[] {
  const raw = str(form, key);
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* fall through to pipe-split */
    }
  }
  return splitPipeList(raw);
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
}

/** Admin: edit hard_declines / soft_cautions / preferred_signals / FL order without a deploy. */
export async function updateCarrierAppetiteRulesAction(formData: FormData) {
  await assertAdmin();
  const carrierId = str(formData, "carrierId") || str(formData, "carrier_id");
  if (!carrierId) throw new Error("carrier_id is required.");
  const has = (key: string) => formData.has(key);
  const flRaw = has("flHoOrder") ? str(formData, "flHoOrder") : has("fl_ho_order") ? str(formData, "fl_ho_order") : "";
  const flHoOrder = flRaw === "" ? undefined : Number.parseInt(flRaw, 10);
  await updateAppetiteRules({
    carrierId,
    hardDeclines: has("hardDeclines") || has("hard_declines")
      ? list(formData, has("hardDeclines") ? "hardDeclines" : "hard_declines")
      : undefined,
    softCautions: has("softCautions") || has("soft_cautions")
      ? list(formData, has("softCautions") ? "softCautions" : "soft_cautions")
      : undefined,
    preferredSignals: has("preferredSignals") || has("preferred_signals")
      ? list(formData, has("preferredSignals") ? "preferredSignals" : "preferred_signals")
      : undefined,
    flHoOrder: flHoOrder !== undefined && Number.isFinite(flHoOrder) ? flHoOrder : undefined,
    notesForAgent: has("notesForAgent") || has("notes_for_agent")
      ? str(formData, has("notesForAgent") ? "notesForAgent" : "notes_for_agent") || null
      : undefined,
  });
  revalidatePath("/carriers");
  revalidatePath("/settings");
}

/** Admin: replace the FL HO routing slug list. Citizens is a normal catalog row. */
export async function saveAppetiteFlHoOrderAction(formData: FormData) {
  await assertAdmin();
  const slugs = list(formData, "flHoOrder").length ? list(formData, "flHoOrder") : list(formData, "fl_ho_order");
  await saveAppetiteFlHoOrder(slugs);
  revalidatePath("/settings");
}
