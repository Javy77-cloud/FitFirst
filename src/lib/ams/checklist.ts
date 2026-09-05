import { formatDay } from "@/lib/domain";
import {
  SERVICING_CHECK_LABELS,
  SERVICING_DOC_LABELS,
  type ServicingCheckKey,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { daysUntilExpiration, expirationDay } from "./renewals";

export type ServicingFile = {
  docType: string;
  slot?: string | null;
};

export type ServicingTask = {
  id: string;
  title: string;
  dueDate: Date | string | null;
};

export type ServicingCheck = {
  id?: string;
  key: ServicingCheckKey;
  status: "complete" | "incomplete";
  notes?: string | null;
  taskId?: string | null;
};

export type ChecklistItem = {
  key: ServicingDocKey | ServicingCheckKey | "next_task";
  label: string;
  ok: boolean;
  detail: string;
  toggleable: boolean;
  checkId?: string | null;
  taskId?: string | null;
};

export type ServicingChecklist = {
  items: ChecklistItem[];
  readyCount: number;
  missingCount: number;
};

const DEC_TYPES = new Set(["policy_dec", "policy_complete"]);
const ID_TYPES = new Set(["policy_id"]);
const AOR_TYPES = new Set(["aor"]);

export function hasServicingDoc(files: ServicingFile[], key: ServicingDocKey): boolean {
  const types =
    key === "dec" ? DEC_TYPES : key === "id_card" ? ID_TYPES : AOR_TYPES;
  return files.some((file) => types.has(file.docType));
}

export function missingServicingDocs(files: ServicingFile[]): ServicingDocKey[] {
  return (["dec", "id_card", "aor"] as const).filter((key) => !hasServicingDoc(files, key));
}

export function checkByKey(
  checks: ServicingCheck[] | undefined,
  key: ServicingCheckKey,
): ServicingCheck | undefined {
  return checks?.find((row) => row.key === key);
}

export function isCheckComplete(
  checks: ServicingCheck[] | undefined,
  key: ServicingCheckKey,
): boolean {
  return checkByKey(checks, key)?.status === "complete";
}

export function servicingTaskTitle(itemKey: ServicingCheckKey, policyNumber: string): string {
  return `Servicing · ${SERVICING_CHECK_LABELS[itemKey]} · ${policyNumber}`;
}

export function servicingTaskBody(itemKey: ServicingCheckKey, policyNumber: string): string {
  return `${SERVICING_CHECK_LABELS[itemKey]} is incomplete on ${policyNumber}. In-desk task only — do not email.`;
}

export function buildServicingChecklist(input: {
  files: ServicingFile[];
  expirationDate: Date | string | null | undefined;
  nextTask: ServicingTask | null;
  checks?: ServicingCheck[];
  asOf?: Date;
}): ServicingChecklist {
  const asOf = input.asOf ?? DESK_AS_OF;
  const exp = expirationDay(input.expirationDate);
  const days = exp ? daysUntilExpiration(exp, asOf) : null;
  const renewalDocsDue = days != null && days >= 0 && days <= 90;
  const idOnFile = hasServicingDoc(input.files, "id_card");
  const idCheck = checkByKey(input.checks, "id_cards");
  const renewalCheck = checkByKey(input.checks, "renewal_docs");
  const inspectionCheck = checkByKey(input.checks, "inspection");
  const mortgageeCheck = checkByKey(input.checks, "mortgagee");

  const items: ChecklistItem[] = [
    {
      key: "dec",
      label: SERVICING_DOC_LABELS.dec,
      ok: hasServicingDoc(input.files, "dec"),
      detail: hasServicingDoc(input.files, "dec")
        ? "Issued dec or complete policy is on this record."
        : "Upload the issued dec on this Policy — shopping decs stay on the Deal.",
      toggleable: false,
    },
    {
      key: "id_cards",
      label: SERVICING_CHECK_LABELS.id_cards,
      ok: idOnFile || idCheck?.status === "complete",
      detail: idOnFile
        ? "ID card file is attached."
        : idCheck?.status === "complete"
          ? "Marked complete on the desk."
          : "No ID cards on this Policy yet.",
      toggleable: true,
      checkId: idCheck?.id ?? null,
      taskId: idCheck?.taskId ?? null,
    },
    {
      key: "renewal_docs",
      label: SERVICING_CHECK_LABELS.renewal_docs,
      ok: !renewalDocsDue
        ? days == null
          ? false
          : true
        : renewalCheck?.status === "complete",
      detail:
        days == null
          ? "No expiration on this Policy."
          : !renewalDocsDue
            ? `Not in the 90-day window. Expires ${formatDay(exp)}.`
            : renewalCheck?.status === "complete"
              ? `Renewal packet complete. Expires in ${days} days.`
              : `Due — expires in ${days} days (${formatDay(exp)}).`,
      toggleable: true,
      checkId: renewalCheck?.id ?? null,
      taskId: renewalCheck?.taskId ?? null,
    },
    {
      key: "inspection",
      label: SERVICING_CHECK_LABELS.inspection,
      ok: inspectionCheck?.status === "complete",
      detail:
        inspectionCheck?.status === "complete"
          ? "Inspection marked complete."
          : "Inspection not on file. Mark complete when the report lands.",
      toggleable: true,
      checkId: inspectionCheck?.id ?? null,
      taskId: inspectionCheck?.taskId ?? null,
    },
    {
      key: "mortgagee",
      label: SERVICING_CHECK_LABELS.mortgagee,
      ok: mortgageeCheck?.status === "complete",
      detail:
        mortgageeCheck?.status === "complete"
          ? "Mortgagee / additional interest is current."
          : "Mortgagee clause still open. File the endorsement when the lender packet is ready.",
      toggleable: true,
      checkId: mortgageeCheck?.id ?? null,
      taskId: mortgageeCheck?.taskId ?? null,
    },
    {
      key: "next_task",
      label: "Next service task",
      ok: Boolean(input.nextTask),
      detail: input.nextTask
        ? input.nextTask.dueDate
          ? `${input.nextTask.title} · due ${formatDay(input.nextTask.dueDate)}`
          : input.nextTask.title
        : "No open service task on this Policy.",
      toggleable: false,
      taskId: input.nextTask?.id ?? null,
    },
  ];
  return {
    items,
    readyCount: items.filter((item) => item.ok).length,
    missingCount: items.filter((item) => !item.ok).length,
  };
}
