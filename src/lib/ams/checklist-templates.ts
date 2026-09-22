import { appointmentLine, type ServicingCheckKey, type ServicingDocKey } from "@/lib/domain-ams";

export type ChecklistLobFamily =
  | "auto"
  | "homeowners"
  | "life"
  | "commercial"
  | "default";

export function resolveChecklistLob(lineOfBusiness: string | null | undefined): ChecklistLobFamily {
  const line = appointmentLine(lineOfBusiness ?? "");
  const raw = (lineOfBusiness ?? "").toUpperCase();
  if (line === "AUTO" || raw === "PA") return "auto";
  if (line === "HO" || raw.startsWith("HO") || raw.startsWith("DP")) return "homeowners";
  if (line === "LIFE" || raw === "LIFE") return "life";
  if (["GL", "WC", "BOP", "COMMERCIAL"].includes(line) || /GL|WC|BOP|CGL/.test(raw)) {
    return "commercial";
  }
  return "default";
}

/**
 * Doc slots collected via packet upload.
 * AOR and ID cards are never auto-required on policy create — agents add them
 * only when they start those flows later.
 */
export const CHECKLIST_DOC_KEYS_BY_LOB: Record<ChecklistLobFamily, ServicingDocKey[]> = {
  auto: ["dec"],
  homeowners: ["dec"],
  life: ["dec"],
  commercial: ["dec"],
  default: ["dec"],
};

/** Toggleable desk checks per LOB. */
export const CHECKLIST_CHECK_KEYS_BY_LOB: Record<ChecklistLobFamily, ServicingCheckKey[]> = {
  auto: ["id_cards", "renewal_docs", "inspection", "mortgagee"],
  homeowners: ["mortgagee", "inspection", "roof_docs", "renewal_docs"],
  life: ["beneficiary", "medical_exam", "underwriting", "renewal_docs"],
  commercial: ["coi", "loss_runs", "ai_endorsements", "renewal_docs"],
  default: ["id_cards", "renewal_docs", "inspection", "mortgagee"],
};
