"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { loadWhyCellAudit, setSynonymCandidateStatus } from "@/lib/extraction/audit";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function approveSynonymCandidate(formData: FormData) {
  const id = str(formData, "id");
  const note = str(formData, "note");
  if (!id) throw new Error("Candidate required");
  const session = await currentDeskSession().catch(() => null);
  await setSynonymCandidateStatus({
    id,
    status: "approved",
    approvedBy: session?.name || session?.email || "desk",
    note:
      note ||
      "Approved for dictionary review — does NOT edit synonyms.ts. Open a PR to ship.",
  });
  revalidatePath("/logs/synonym-candidates");
  revalidatePath("/settings/synonym-candidates");
  flashAction("/logs/synonym-candidates", "Synonym candidate approved (dictionary unchanged)");
}

export async function rejectSynonymCandidate(formData: FormData) {
  const id = str(formData, "id");
  const note = str(formData, "note");
  if (!id) throw new Error("Candidate required");
  await setSynonymCandidateStatus({
    id,
    status: "rejected",
    note: note || null,
  });
  revalidatePath("/logs/synonym-candidates");
  revalidatePath("/settings/synonym-candidates");
  flashAction("/logs/synonym-candidates", "Synonym candidate rejected");
}

export async function markSynonymCandidateShipped(formData: FormData) {
  const id = str(formData, "id");
  const note = str(formData, "note");
  if (!id) throw new Error("Candidate required");
  const session = await currentDeskSession().catch(() => null);
  await setSynonymCandidateStatus({
    id,
    status: "shipped",
    approvedBy: session?.name || session?.email || "desk",
    note: note || "PR needed / merged — synonyms.ts updated offline.",
  });
  revalidatePath("/logs/synonym-candidates");
  flashAction("/logs/synonym-candidates", "Marked shipped");
}

export async function getWhyCellAuditAction(dealId: string, fieldKey: string) {
  return loadWhyCellAudit(dealId, fieldKey);
}
