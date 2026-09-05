import { formatDay } from "@/lib/domain";
import { SERVICING_DOC_LABELS, type ServicingDocKey } from "@/lib/domain-ams";

export type ServicingFile = {
  docType: string;
  slot?: string | null;
};

export type ServicingTask = {
  id: string;
  title: string;
  dueDate: Date | string | null;
};

export type ChecklistItem = {
  key: ServicingDocKey | "renewal" | "next_task";
  label: string;
  ok: boolean;
  detail: string;
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

export function buildServicingChecklist(input: {
  files: ServicingFile[];
  expirationDate: Date | string | null | undefined;
  nextTask: ServicingTask | null;
}): ServicingChecklist {
  const renewal = input.expirationDate ? formatDay(input.expirationDate) : "";
  const items: ChecklistItem[] = [
    {
      key: "dec",
      label: SERVICING_DOC_LABELS.dec,
      ok: hasServicingDoc(input.files, "dec"),
      detail: hasServicingDoc(input.files, "dec")
        ? "Issued dec or complete policy is on this record."
        : "Upload the issued dec on this Policy — shopping decs stay on the Deal.",
    },
    {
      key: "id_card",
      label: SERVICING_DOC_LABELS.id_card,
      ok: hasServicingDoc(input.files, "id_card"),
      detail: hasServicingDoc(input.files, "id_card")
        ? "ID card file is attached."
        : "No ID card on this Policy yet.",
    },
    {
      key: "aor",
      label: SERVICING_DOC_LABELS.aor,
      ok: hasServicingDoc(input.files, "aor"),
      detail: hasServicingDoc(input.files, "aor")
        ? "AOR packet is on file."
        : "AOR packet slot is empty. Not a licensed ACORD product.",
    },
    {
      key: "renewal",
      label: "Renewal date",
      ok: Boolean(renewal),
      detail: renewal ? `Expires ${renewal}` : "No expiration on this Policy.",
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
    },
  ];
  return {
    items,
    readyCount: items.filter((item) => item.ok).length,
    missingCount: items.filter((item) => !item.ok).length,
  };
}
