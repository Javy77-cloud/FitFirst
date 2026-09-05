import {
  INSTALLMENT_DISCLAIMER,
  installmentNextStep,
  isBillType,
  isInstallmentStatus,
  type BillType,
  type InstallmentStatus,
} from "@/lib/domain-ams";

export type InstallmentAction = "mark_due" | "receive" | "mark_past_due" | "waive";

export function nextInstallmentStatus(
  status: InstallmentStatus,
  action: InstallmentAction,
): InstallmentStatus | null {
  if (action === "waive" && (status === "scheduled" || status === "due" || status === "past_due")) {
    return "waived";
  }
  if (action === "mark_due" && status === "scheduled") return "due";
  if (action === "mark_past_due" && status === "due") return "past_due";
  if (action === "receive" && (status === "scheduled" || status === "due" || status === "past_due")) {
    return "received";
  }
  return null;
}

export function installmentCollectsMoney(): false {
  return false;
}

export function installmentChangesPolicy(): false {
  return false;
}

export function isOpenInstallment(status: string): boolean {
  return isInstallmentStatus(status) && (status === "scheduled" || status === "due" || status === "past_due");
}

export function installmentLine(policyNumber: string, status: string): string {
  return `Installment · ${policyNumber} · ${status.replaceAll("_", " ")}`;
}

export function installmentActionCopy(status: string): string {
  return installmentNextStep(status);
}

export function validateInstallmentDraft(input: {
  billType: string;
  amount: string;
  dueOn: Date | null;
  notes?: string | null;
}):
  | { ok: true; billType: BillType; amount: string; dueOn: Date; notes: string | null }
  | { ok: false; error: string } {
  if (!isBillType(input.billType)) {
    return { ok: false, error: "Choose agency bill or direct bill." };
  }
  const amount = input.amount.trim();
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "A positive installment amount is required." };
  }
  if (!input.dueOn) return { ok: false, error: "A due date is required." };
  return {
    ok: true,
    billType: input.billType,
    amount: n.toFixed(2),
    dueOn: input.dueOn,
    notes: input.notes?.trim() || null,
  };
}

export { INSTALLMENT_DISCLAIMER };
