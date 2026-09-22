import {
  INSPECTION_DISCLAIMER,
  inspectionKindLabel,
  inspectionNextStep,
  isInspectionKind,
  isInspectionStatus,
  type InspectionKind,
  type InspectionStatus,
} from "@/lib/domain-ams";

export type InspectionAction = "schedule" | "complete" | "waive";

export function nextInspectionStatus(
  status: InspectionStatus,
  action: InspectionAction,
): InspectionStatus | null {
  if (action === "waive" && (status === "requested" || status === "scheduled")) return "waived";
  if (action === "schedule" && status === "requested") return "scheduled";
  if (action === "complete" && status === "scheduled") return "completed";
  return null;
}

export function inspectionFilesPolicy(): false {
  return false;
}

export function isOpenInspection(status: string): boolean {
  return isInspectionStatus(status) && (status === "requested" || status === "scheduled");
}

export function inspectionLine(kind: string, policyNumber: string): string {
  return `${inspectionKindLabel(kind)} · ${policyNumber}`;
}

export function inspectionActionCopy(status: string): string {
  return inspectionNextStep(status);
}

export function validateInspectionDraft(input: {
  kind: string;
  vendor?: string | null;
  scheduledOn: Date | null;
  notes?: string | null;
}):
  | { ok: true; kind: InspectionKind; vendor: string | null; scheduledOn: Date | null; notes: string | null }
  | { ok: false; error: string } {
  if (!isInspectionKind(input.kind)) {
    return { ok: false, error: "Choose Four-Point, wind mit, roof, or photo." };
  }
  return {
    ok: true,
    kind: input.kind,
    vendor: input.vendor?.trim() || null,
    scheduledOn: input.scheduledOn,
    notes: input.notes?.trim() || null,
  };
}

export { INSPECTION_DISCLAIMER };
