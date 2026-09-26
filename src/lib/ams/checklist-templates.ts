import { appointmentLine, type ServicingCheckKey, type ServicingDocKey } from "@/lib/domain-ams";
import { isErrorsOmissionsProduct } from "@/lib/policy/eo";

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
  if (isErrorsOmissionsProduct(lineOfBusiness)) return "commercial";
  return "default";
}

/**
 * Auto-required doc slots collected via packet upload.
 * AOR and ID cards are never required for completion — agents may attach them
 * later on Documents. Checklist extras must not treat them as Missing / On file
 * blockers.
 */
export const CHECKLIST_DOC_KEYS_BY_LOB: Record<ChecklistLobFamily, ServicingDocKey[]> = {
  auto: ["dec"],
  homeowners: ["dec"],
  life: ["dec"],
  commercial: ["dec"],
  default: ["dec"],
};

/**
 * Desk checks per LOB. Upload-backed keys derive status from files.
 * Manual Mark complete stays only on beneficiary, medical exam, and underwriting.
 */
export const CHECKLIST_CHECK_KEYS_BY_LOB: Record<ChecklistLobFamily, ServicingCheckKey[]> = {
  auto: ["id_cards", "renewal_docs", "inspection", "mortgagee"],
  homeowners: ["mortgagee", "inspection", "roof_docs", "renewal_docs"],
  life: ["beneficiary", "medical_exam", "underwriting", "renewal_docs"],
  commercial: ["coi", "loss_runs", "ai_endorsements", "renewal_docs"],
  default: ["id_cards", "renewal_docs", "inspection", "mortgagee"],
};
