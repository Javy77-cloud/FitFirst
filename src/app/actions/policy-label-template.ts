"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import {
  isPolicyLabelFieldId,
  normalizePolicyLabelTemplate,
  type PolicyLabelFieldId,
  type PolicyLabelTemplate,
} from "@/lib/policy/auto-label";
import {
  clearAllPolicyLabelOverrides,
  saveAgencyPolicyLabelTemplate,
  saveAllowPolicyLabelOverride,
} from "@/lib/policy/auto-label-prefs";

export async function savePolicyLabelTemplate(input: {
  fields: string[];
  separator: string;
}): Promise<PolicyLabelTemplate> {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  const fields = input.fields.filter((id): id is PolicyLabelFieldId => isPolicyLabelFieldId(id));
  const saved = await saveAgencyPolicyLabelTemplate(
    normalizePolicyLabelTemplate({ fields, separator: input.separator }),
  );
  revalidatePath("/settings/policy-labels");
  revalidatePath("/policies");
  return saved;
}

export async function resetPolicyLabelTemplate(): Promise<PolicyLabelTemplate> {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  const saved = await saveAgencyPolicyLabelTemplate(null);
  revalidatePath("/settings/policy-labels");
  revalidatePath("/policies");
  return saved;
}

/** Admin-only agency pref: when off, rename UI stays off policy detail. */
export async function setAllowPolicyLabelOverride(formData: FormData): Promise<void> {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  const enabled = String(formData.get("allowPolicyLabelOverride") ?? "") === "1";
  await saveAllowPolicyLabelOverride(enabled);
  revalidatePath("/settings/policy-labels");
  revalidatePath("/policies");
}

/** Admin-only: wipe all per-policy label overrides (restore auto-labels). */
export async function clearPolicyLabelOverridesAction(): Promise<
  { ok: true; cleared: number } | { ok: false; error: string }
> {
  const session = await currentDeskSession();
  if (!session.isAdmin) return { ok: false, error: "Admin only." };
  const cleared = await clearAllPolicyLabelOverrides();
  revalidatePath("/settings/policy-labels");
  revalidatePath("/policies");
  return { ok: true, cleared };
}
